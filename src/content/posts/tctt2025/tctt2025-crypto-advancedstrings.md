---
title: Thailand Cyber Top Talent 2025 [OPEN] — Digital Forensics
published: 2025-11-15
description: Digtal Forensics Writeups from TCTT2025
tags:
  - CTF
  - Digital Forensics
category: CTF
draft: false
---
# Recycle Secrets [100 pts] - Digital Forensics Write-up

## โจทย์

**หมายเหตุ** รูปแบบของ Flag ที่เป็นคำตอบของข้อนี้คือ **flag{message}**

ไฟล์ที่ได้รับ
```
recycle_secrets.img (100MB)
```
---

## ข้อสังเกต
- ไฟล์ที่ได้รับเป็นไฟล์ .img ต้องทำ Image Forensics (ใช้ Autopsy)
- มีจุดน่าสนใจ คือ $RECYCLE.BIN
---

## แนวคิดการแก้โจทย์
1. ใช้ Autopsy สำรวจ Partition ทั้งหมด
2. หาร่องรอย/ไฟล์ที่ซ่อนอยู่

จากการสำรวจ พบไฟล์ DEL123.txt อยู่ใน $RECYCLE.BIN

<img width="377" height="212" alt="image" src="https://github.com/user-attachments/assets/063afe1a-4d8e-469a-845a-9c37121b8d3a" />


เมื่อดูเนื้อหาในไฟล์ DEL123.txt พบข้อความที่ถูกเข้ารหัสไว้ คือ
```
246ovpbPtH1VEa1wFrVY9mqfuwJMZiku419ZZjz
```
<img width="413" height="167" alt="image" src="https://github.com/user-attachments/assets/3231f84f-0bb1-436f-92c4-b4b7948a883e" />

เมื่อนำข้อความที่เข้ารหัสไปถอดด้วย CyberChef จะพบว่าสามารถใช้ Magic Wand ได้ เมื่อถอดรหัสอัตโนมัติพบว่าเป็นการเข้ารหัสแบบ Base58 และจะได้ Flag

---

## ผลลัพธ์
เมื่อนำไปถอดรหัสแบบ Base58 ด้วย CyberChef พบข้อความที่อ่านได้ คือ  จะได้ Flag:
```
flag{recycle_bin_caught_you}
```
<img width="912" height="576" alt="image" src="https://github.com/user-attachments/assets/ca0eef0c-0bc7-4621-8a7f-ad655dd844e7" />

---
# Hidden Partition [100 pts] - Digital Forensics Write-up

## โจทย์

**หมายเหตุ** รูปแบบของ Flag ที่เป็นคำตอบของข้อนี้คือ **flag{message}**

ไฟล์ที่ได้รับ
```
hidden_partition.img (200MB)
```
---

## ข้อสังเกต
- ไฟล์ที่ได้รับเป็นไฟล์ .img ต้องทำ Image Forensics (ใช้ Autopsy)
- มี Disk Partition อยู่ 4 Volume คือ
  - vol1 (Unallocated: 0-2047)
  - vol2 (Win95 FAT32 (0x0c): 2048-204799)
  - vol3 (Linux (0x83): 204800-407551)
  - vol4 (Unallocated: 407552-409599)
---

## แนวคิดการแก้โจทย์
1. ใช้ Autopsy สำรวจ Partition ทั้งหมด
2. หาร่องรอย/ไฟล์ที่ซ่อนอยู่

จากการสำรวจ พบไฟล์ secret.txt อยู่ใน vol3 (Linux (0x83): 204800-407551)
<img width="1709" height="481" alt="image" src="https://github.com/user-attachments/assets/09bb05e2-0be7-409f-9127-3ae2d9dd8097" />

เมื่อดูเนื้อหาในไฟล์ secret.txt พบข้อความ
```
synt{lbh_sbhaq_uvqqra_cnegvgvba}
```
<img width="617" height="158" alt="image" src="https://github.com/user-attachments/assets/b7229da0-c8af-4a61-81c8-f9b02b10d0aa" />

จากข้อความที่พบ มีความเป็นไปได้ว่าจะเข้ารหัสด้วย Caesar Cipher เนื่องจากในส่วนของข้อความถูกเข้ารหัสไว้ แต่อักขระพิเศษไม่ถูกรหัสเข้าด้วย

---

## ผลลัพธ์
เมื่อนำไป Brute Force ด้วย Caesar Cipher (dcode.fr) พบข้อความที่อ่านได้ คือ  จะได้ Flag:
```
flag{you_found_hidden_partition}
```
<img width="345" height="198" alt="image" src="https://github.com/user-attachments/assets/bfb067cd-a098-4a6b-b668-7290f3af9089" />
---
# Hidden Payload [200 pts] - Digital Forensics Write-up

## โจทย์

ไฟล์ที่ได้รับ
```
hidden_payload.iso (362kb)
```
---

## ข้อสังเกต
- ไฟล์ที่ได้รับเป็นไฟล์ .iso (สามารถเปิดด้วยโปรแกรม Unzip ใด ๆ ได้)
- มีไฟล์ถูกบีบอัดด้านในคือ filler.txt
---

## แนวคิดการแก้โจทย์
1. ใช้โปรแกรม Unzip ในการดูไฟล์ที่อยู่ด้านใน
2. สำรวจสิ่งที่เป็นประโยชน์ต่อการแก้โจทย์

   - เมื่อ Extract ไฟล์ออกมา พบว่าเป็นไฟล์เปล่า
   - ใช้คำสั่ง exiftool  fillter.txt -v ดูแล้วไม่พบข้อมูลใด ๆ
     <img width="675" height="185" alt="image" src="https://github.com/user-attachments/assets/42b46cff-89ea-436c-911f-6c755049a8b9" />

   - ใช้คำสั่ง exiftool hidden_payload.iso -v แล้วไม่พบข้อมูลใด ๆ
     <img width="758" height="537" alt="image" src="https://github.com/user-attachments/assets/30867173-0186-4a1c-9946-cf415f520393" />

   - ใช้คำสั่ง strings hidden_payload.iso แล้ว พบข้อความเข้ารหัส คือ
   ``` SGludDogUmlqbmRhZWwga2V5ICgxMjgtYml0KSA9IEFTQ0lJICdKJyByZXBlYXRlZCBhbmQgaGV4LWVuY29kZWQgCg==  ```
<img width="1386" height="486" alt="image" src="https://github.com/user-attachments/assets/929a2725-6864-4104-ac1a-1c4308daa5dc" />

   - นำไปถอดด้วย CyberChef ได้ข้อความว่า
   ``` Hint: Rijndael key (128-bit) = ASCII 'J' repeated and hex-encoded ```
    **J = 4a เมื่อนำไปเข้ารหัสแบบ Hex**

   <img width="1343" height="579" alt="image" src="https://github.com/user-attachments/assets/a9aab908-fcb0-48c5-8450-0f679092a966" />

   - จาก Hint พบว่ามีการเข้ารหัสซ่อนไว้ใน .iso อีก ให้ทำการสำรวจโดยใช้

     ```hexdump -C hidden_payload.iso | less```
   - หลัง Sector ที่ 30 (ส่วน Directory Record) พบว่ามีข้อความที่อ่านไม่ได้อยู่ ที่ Offset 102400 (00019000)
     <img width="648" height="354" alt="image" src="https://github.com/user-attachments/assets/0d9311fe-dba7-45de-a346-523c360860af" />

   - copy byte-level ตั้งแต่ Offset 102400 ออกมา ด้วยคำสั่ง
  
     ```dd if=hidden_payload.iso of=enc.bin bs=1 skip=102400 count=2048``` (ดึงออกมา 1 Sector)

   - ถอดรหัสไฟล์ enc.bin ด้วยคำสั่ง
  
     ```openssl enc -d -aes-128-ecb -in enc.bin -out dec.txt -K 4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a -nopad```
      <img width="815" height="145" alt="image" src="https://github.com/user-attachments/assets/6bc3a284-5e1b-451c-b622-e3f04702becb" />

   - เมื่อเปิดดูไฟล์ dec.txt จะพบ PowerShell Script จะพบข้อมูล
 ```powershell
      $key = 0x4A
      $data = @(0x2c,0x26,0x2b,0x2d,0x31,0x3a,0x25,0x3d,0x2f,0x38,0x39,0x22,0x2f,0x26,0x26,0x15,0x32,0x25,0x38,0x15,0x22,0x23,0x2e,0x2e,0x2f,0x24,0x15,0x39,0x25,0x15,0x2f,0x2b,0x39,0x33,0x37)
      $decoded = $data | ForEach-Object { [char]($_ -bxor $key) }
      Write-Output ($decoded -join "")
 ```
   - จาก PowerShell Script พบว่ามีการนำข้อมูลไป XOR
   
   - นำข้อมูลไป XOR ด้วย Python Script อย่างง่าย
```python
      HEX_VALUES = [0x2c,0x26,0x2b,0x2d,0x31,0x3a,0x25,0x3d,0x2f,0x38,0x39,0x22,0x2f,0x26,0x26,0x15,0x32,0x25,0x38,0x15,0x22,0x23,0x2e,0x2e,0x2f,0x24,0x15,0x39,0x25,0x15,0x2f,0x2b,0x39,0x33,0x37]

      KEY = 0x4A

      out = []
      for n in HEX_VALUES:
            out.append(chr((n ^ KEY) & 0xFF))

      print("".join(out))
 
```
---

## ผลลัพธ์
เมื่อรัน Python Script จะได้ Flag:
```
flag{powershell_xor_hidden_so_easy}
```

<img width="681" height="57" alt="image" src="https://github.com/user-attachments/assets/6d5ebc86-48d5-4cf2-a13e-57f12edd4bcb" />

---
# Shadow-Hive [300pts] - Digital Forensics Write-up

## โจทย์
**หมายเหตุ** รูปแบบของ Flag ที่เป็นคำตอบของข้อนี้คือ **flag{message}**

---

## ข้อสังเกต
- ไฟล์ที่ได้รับเป็นไฟล์ .img ต้องทำ Image Forensics (ใช้ Autopsy)
- พบไฟล์ `Shadow-Hive-Infection.hiv` เป็น Registry Hive ของ Windows
- ค้นหา strings พบค่า `ShadowDecryptor`
- Key ShadowDecryptor Value ถูกเข้ารหัสไว้

---

## แนวคิดการแก้โจทย์
1. แปลงไฟล์ .hiv ด้วย `hivexml`
   
   ```hivexml Shadow-Hive-Infection.hiv > hive.xml```
2. ค้นหาคำ ที่น่าสงสัย เช่น `flag`, `decrypt`, `shadow`

   ```grep -ni "shadow\|flag\|decrypt" hive.xml```
3. พบ Key ที่นี่สงสัย คือ `ShadowDecryptor`
   <img width="1383" height="391" alt="image" src="https://github.com/user-attachments/assets/07fda783-ea42-43ff-9057-a86674157f4c" />

4. นำค่าที่ถูกเข้ารหัสมาถอดรหัสด้วย CyberChef (Magic) สามารถถอดรหัสจาก Base64 ได้ข้อความ ดังนี้
<img width="949" height="554" alt="image" src="https://github.com/user-attachments/assets/f8307e50-714d-4845-bf89-354d9e9724d4" />

5. จากการวิเคราะห์ข้อความ พบว่าเป็น PowerShell Script และมีการใช้ AES-CBC + PKCS7 
   - Key = `4B4b4b4b4B4b4B4B4b4B4b4b4b4B4B4b`  
   - IV = `"shadow_hive_regi"`  (.Substring(0,16) คือการเอา substring เริ่มที่ index 0 ยาว 16 ตัวอักษรของ shadow_hive_registry_aes)
   - Ciphertext = `'dZDm9yXHjlQ1DrXRfINop2Wi9aUDw8ttxyLjn7obyIE='`  
6. ถอดรหัส Ciphertext ด้วย Key + IV ที่ได้ด้วย CyberChef ด้วยสูตร From Base64 > AES Decrypt (AES-CBC | Key 4B4b4b4b4B4b4B4B4b4B4b4b4b4B4B4b (HEX) | IV shadow_hive_regi (UTF-8/Latin1) จะได้ Flag 

---

## ผลลัพธ์
ถอดรหัส Ciphertext ด้วย Key + IV ที่ได้ด้วย CyberChef ด้วยสูตร From Base64 > AES Decrypt (AES-CBC | Key 4B4b4b4b4B4b4B4B4b4B4b4b4b4B4B4b (HEX) | IV shadow_hive_regi (UTF-8/Latin1) ได้ Flag:

```
flag{Shadow_Hive_Registry_AES}
```
<img width="955" height="402" alt="image" src="https://github.com/user-attachments/assets/4cea7d30-58ec-4c25-bd44-870852b6e973" />

---
