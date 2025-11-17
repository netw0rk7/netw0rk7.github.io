---
title: Thailand Cyber Top Talent 2025 [OPEN] — Networking
published: 2025-11-16
description: Network Writeups from TCTT2025
image: "https://github.com/user-attachments/assets/b5356944-ca38-4fa0-8714-8a9ffa249aab"
tags:
  - CTF
  - Networking
category: CTF
draft: false
---

Github : https://github.com/netw0rk7/Thailand-Cyber-Top-Talent-2025-Writeup/tree/ctf/Network

# Meet the New Router (100 pts) - Network Security Write-up
## โจทย์
จิบกาแฟเพลินๆ ที่ร้านโปรดแถวสยาม ☕️ ... เผลอต่อ Wi-Fi ฟรีไปแป๊บนึง แต่เอ๊ะ... ทำไม IPv6 traffic มันดูแปลกๆ?
หัวหน้าโยนไฟล์ packet capture มาให้แล้วบอกสั้นๆ "ไปดูดิ๊... ว่าข้อมูลอะไรโดนฉกไป"

File: thctt2025_open_netsec1_new-router.pcapng

Flag format :  flag{MD5}

---

## แนวคิดการแก้โจทย์
1. ไฟล์ thctt2025_open_netsec1_new-router.pcapng เป็นไฟล์ Packet Capture
2. ใช้ Wireshark ในการดู Packet และใช้ tshark ในการ Export Data
3. สำรวจไฟล์ Packet จะพบว่ามี Data เป็น Hex
   <img width="1920" height="772" alt="image" src="https://github.com/user-attachments/assets/c7e04a25-0337-4ac1-b0a0-54822cff1596" />
   <img width="1920" height="728" alt="image" src="https://github.com/user-attachments/assets/37cce61b-5b08-47ea-91c0-18063dffba0f" />

4. ดึง Data ออกมาด้วย tshark โดยใช้คำสั่ง
   ```bash
   tshark -r thctt2025_open_netsec1_new-router.pcapng -Y "icmpv6.type == 128" -T fields -e data | tr '\n' ' ' 
   ```
5. จะได้ Data Hex คือ
   
   ``` 66 6c 61 67 7b 34 61 34 33 37 39 35 65 39 32 37 33 31 33 38 61 63 63 30 37 38 63 32 32 34 39 61 64 32 37 66 64 7d 4e4f495345 ```
6. นำ Hex ไปถอดรหัสด้วย CyberChef (สูตร From Hex) จะได้ Flag
   
---

## ผลลัพธ์
เมื่อนำ Hex ไปถอดรหัสด้วย CyberChef (สูตร From Hex) จะได้ Flag
```
flag{4a43795e9273138ac078c229d27fd}
```
<img width="1539" height="263" alt="image" src="https://github.com/user-attachments/assets/c9c59664-2ce4-4712-b3ea-8b9d607bdadc" />

---

# Meet the Upgraded Router (100 pts) - Network Security Write-up
## โจทย์
ดูเหมือนว่าแฮกเกอร์จะอัปเกรด C2 (Command & Control) ที่ใช้ขโมยข้อมูลเป็นเวอร์ชันใหม่แล้ว
ไม่แน่ว่า... payload ที่ส่งออกมาอาจจะไม่ได้มาแบบธรรมดา ๆ เหมือนรอบที่แล้ว... XOR สักหน่อยดีไหม?

File: thctt2025_open_netsec2_upgraded-router.pcapng

---

## ข้อสังเกต
- Traffic ที่น่าสงสัย คือ ICMPv6 Echo Request (type 128)  
- พบว่ามีการใช้ Echo Identifier = 0x1337 (มี payload 1 byte) และ 0xBEEF (มี payload 12 byte)
- เมื่อสำรวจพบว่า 0xBEEF เป็น payload ที่สับไว้จนอ่านไม่ออก
- Payload ที่ส่งออกมามีลักษณะแปลก
- ทดลอง XOR 0-255

---

## แนวคิดการแก้โจทย์
1. ใช้ `tshark` ดึง Packet เฉพาะ ICMPv6 Echo Request ที่ `identifier == 0x1337`  
2. ดึง field `data.data` ออกมาเป็น hex และต่อให้เป็น String เดียว  
3. แปลง hex เป็น bytes  
4. Brute-force key 0–255 โดย XOR ทุก Byte  
5. เช็ค regex `flag{32-hex}`  
6. เจอ flag

---

## อธิบาย Script

```python
import subprocess, re, sys

PCAP = "thctt2025_open_netsec2_upgraded-router.pcapng"
FILT = "icmpv6.type == 128 && icmpv6.echo.identifier == 0x1337"

out = subprocess.check_output(
    ["tshark", "-r", PCAP, "-Y", FILT, "-T", "fields", "-e", "data.data"]
).decode("utf-8", "ignore")

hx = out.replace(":", "").replace("\n", "").strip()
if not hx:
    print("PAYLOAD NOT FOUND PLEASE CHECK FILTER")
    sys.exit(1)
raw = bytes.fromhex(hx)

pat = re.compile(r"flag\{[0-9a-f]{32}\}")
for k in range(256):
    txt = bytes(b ^ k for b in raw).decode("utf-8", "ignore")
    m = pat.search(txt)
    if m:
        print("KEY = 0x%02x" % k)
        print(m.group(0))
        sys.exit(0)

print("FLAG NOT FOUND")
print(bytes(b ^ 0x37 for b in raw).decode("utf-8", "ignore"))

```

- ใช้ `tshark` คัดแค่ Packet ที่เราจะใช้ 
- รวม payload ให้เป็นชุดเดียว 
- Brute-force key 0–255 แล้วตรวจด้วย regex `flag{...}`  
- Print flag หากพบ

---

## ผลลัพธ์
เมื่อรัน Python Script จะได้ Flag ดังนี้
```
KEY = 0x37
flag{e1fa89bb89b67848d0a9ae0135fad032}
```

---

# Whispers in the Wire (200pts) - Network Security Write-up
---
## โจทย์
ฐานทัพไซเบอร์แห่งใหม่เพิ่งถูกสร้างขึ้นโดยประเทศเพื่อนบ้าน พวกเขาใช้ระบบควบคุมแบบ gRPC over HTTP/2 เพื่อซ่อนคำสั่งลับและข้อมูลสำคัญระหว่าง นักวิจัยและเซิร์ฟเวอร์ทดสอบอาวุธ
แต่โชคดี ที่หน่วยไซเบอร์ของเราได้ แอบเก็บ ไฟล์ PCAP ที่บันทึกการสื่อสารได้มาแล้ว 🎧
แรก ๆ มันดูเหมือนข้อมูลไร้ค่า ที่อ่านไม่ออกทันที, ข้อความยังดูเหมือนอาจจะถูกบีบอัดด้วย zlib ไว้ อีกต่างหาก…
อย่างไรก็ตาม มีข่าวลือว่า ข้อความตอบกลับจาก ซ่อน flag เอาไว้! 🏴‍☠️

ภารกิจของคุณคือแกะรอยจากไฟล์ PCAP เพื่อดึง flag ที่ถูกซ่อนอยู่ให้ได้

---

## ข้อสังเกต
1. gRPC วิ่งบน HTTP/2 ทำให้การตามสตรีม (Follow TCP Stream) ปกติอ่านยาก  
2. ข้อมูลที่ซ่อนน่าจะถูกบีบอัดด้วย zlib
3. `zlib` มักขึ้นต้นด้วยไบต์ `78 01`, `78 5E`, `78 9C` หรือ `78 DA`  
4. ดังนั้นเราสามารถกวาดตำแหน่งเหล่านี้ในไฟล์ PCAP ได้ แล้วลองถอด (decompress) เพื่อหาข้อความที่อ่านออก

---

## แนวคิดการแก้โจทย์
1. เปิดไฟล์ `.pcapng` ด้วย Python (อ่านเป็น binary ตรง ๆ)  
2. ทุกตำแหน่งว่ามีค่าเริ่มต้นตรงกับ header ของ zlib หรือไม่  
3. ถ้ามี ลอง `zlib.decompress()` ดู  
4. ถอดสำเร็จก็เช็กว่ามีข้อความ `flag{...}` อยู่หรือไม่ 

---

## อธิบาย Script
```python
import zlib, re

PCAP = "thctt2025_open_netsec3_whisper-in-the-wire.pcapng"

ZLIB_HDRS = [b"\x78\x01", b"\x78\x5e", b"\x78\x9c", b"\x78\xda"]

def find_flag(path):
    data = open(path, "rb").read()
    for i in range(len(data)-2):
        if data[i:i+2] in ZLIB_HDRS:
            for end in range(i+10, i+5000):
                try:
                    out = zlib.decompress(data[i:end])
                    m = re.search(rb"flag\{.*?\}", out)
                    if m:
                        return m.group(0).decode()
                    break
                except:
                    pass
    return None

if __name__ == "__main__":
    flag = find_flag(PCAP_FILE)
    if flag:
        print("Flag found! = ", flag)
    else:
        print("Flag not found!")
```
1. สร้าง List ค่า header ของ zlib
2. อ่านไฟล์ทั้งหมดเป็น binary
3. วนทุก byte เช็กว่า 2 byte ว่าตรงกับ header zlib หรือไม่
4. ถ้าเจอ header ให้ลองขยายข้อมูลจากตำแหน่งเริ่มต้นไปเรื่อย ๆ (i+10 ถึง i+5000)
5. ใช้ zlib.decompress() เพื่อถอดการบีบอัด
6. ใช้ regex หา string ที่อยู่ในรูป flag{...}
7. return ค่า flag

---

## ผลลัพธ์
เมื่อรัน Python Script แล้ว จะได้ Flag

`flag{fd3ca5a5acce56f112a725ce433c96e4}`

---

# Custom Protocol V2 [300pts] - Network Security Write-up
## โจทย์
--- ไม่ได้บันทึกไว้ ---

---

## ข้อสังเกต
- Packet STH v2 จะเริ่มด้วย `"STH"` และ `version=0x02`  
- Packet type ที่สำคัญ ได้แก่
  - HELLO (0x01) เก็บ `client_nonce` 8 ไบต์
  - WELCOME (0x02) เก็บค่าพารามิเตอร์การถอดรหัส เช่น `server_nonce`, `salt`, จำนวนชิ้นส่วน, ค่า LCG (`a,c,seed`), และ `flags2`
  - DATA (0x10) เก็บชิ้นส่วน ciphertext  
- ตรวจ CRC32 เพื่อคัด Packet ที่ถูกต้อง
- ชิ้นส่วน DATA ถูกสลับลำดับด้วย LCG 
- `flags2` ระบุว่ามีการ base64 encode หรือ reverse  

---

## แนวคิดการแก้โจทย์
1. ใช้ไฟล์ pcap ดึงเฉพาะ UDP/31337  
2. ตรวจหา packet ที่เป็น STH v2 (`"STH"`, `version=0x02`)  
3. เก็บ `client_nonce` จาก HELLO, เก็บพารามิเตอร์จาก WELCOME, เก็บชิ้นส่วนจาก DATA  
4. ใช้สูตร LCG `(a*x+c) mod n` เพื่อนำมาเรียงเป็น ciphertext  
5. ถอด base64 และ reverse strings 
6. สร้าง keystream จาก `(session_id || client_nonce || server_nonce || salt || k)` แล้ว XOR กับ ciphertext  
7. คลาย zlib จะได้ plaintext   

---

## อธิบาย Script
- ใช้ `struct.unpack` แกะ global header ในการอ่าน pcap แล้ววนแพ็กเก็ตทีละตัว  
- Filter UDP โดยการเช็คว่าเป็น IPv4+UDP และ Port 31337  
- Filter STH v2 โดยการเช็ค header `"STH"` และเวอร์ชัน 0x02  
- ตรวจ CRC32 ถ้าไม่ตรงจะทิ้ง packet นั้น ๆ
- เก็บ client_nonce  
- เก็บ server_nonce, salt, n, a, c, seed, flags2
- เก็บ payload กับ seq  
- ใช้ LCG order ในการวาง DATA ให้ถูกต้อง  
- ถ้า flags2 มี base64 จะถอดรหัส และถ้ามี reverse ก็จะ reverse strings 
- สร้าง keystream ด้วย SHA256, XOR, แล้ว `zlib.decompress`  
- ใช้ regex `flag{.*?}` ถ้าเจอให้พิมพ์ออกมา  

---

## ผลลัพธ์
เมื่อรัน Python Script จะได้ Flag:  

```
flag{48e64c539d58ac64f574b3c9abd9b6b1}
```

---
