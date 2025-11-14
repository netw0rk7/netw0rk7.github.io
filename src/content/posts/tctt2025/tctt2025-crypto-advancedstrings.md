---
title: Thailand Cyber Top Talent 2025 [OPEN] — AdvancedStringsSecret
published: 2025-11-15
description: AdvancedStringsSecret Cryptography Writeups from TCTT2025
tags:
  - CTF
  - Cryptography
category: CTF
draft: false
---
## โจทย์
วัตถุประสงค์ของการเข้ารหัสลับคือต้องมีเฉพาะผู้รับและผู้ส่งเท่านั้นที่เข้าใจรหัสลับนั้นได้ แต่คนส่วนใหญ่มักใช้วิธีการเดากระบวนการเข้ารหัสลับเพื่อใช้ในการถอดรหัส ข้อความลับในโจทย์ข้อนี้ก็เช่นกัน จงใช้ทักษะพื้นฐานของการถอดรหัสนั่นคือการ “เดา” เพื่อค้นหา Flag ที่คุณต้องการ

**หมายเหตุ** รูปแบบของ Flag ที่เป็นคำตอบของข้อนี้คือ **flag{message_10digits}**

---

## ข้อสังเกต
1. ชุดอักขระที่ใช้กว้างมาก เมื่อใช้ CyberChef พบ Magic Wand แปลงจาก Base85
2. หลังถอด Base85 แล้วได้สตริงใหม่ที่อักขระจำกัดอยู่ในเซต  
   `[0-9 A-Z $%*+-.:/]`  
   สามารถเดาได้ว่านี่เป็น **ลักษณษะของ Base45** (https://datatracker.ietf.org/doc/rfc9285/)
3. เมื่อถอด Base45 ได้ข้อความ/โค้ดที่เต็มไปด้วยสัญลักษณ์ประหลาด ๆ  
   เช่น `=<` `)?` `;+` ฯลฯ ซึ่งตรงกับเอกลักษณ์ของ **Malbolge** (ภาษา esolang)

**ขอบคุณแนวคิดจากคุณ `รอลงอาญา_nack` และ `PoE_Sirati`**

---

## แนวคิดการแก้โจทย์
1. ตรวจสอบลักษณะของ ciphertext สามารถใช้ CyberChef ถอดรหัสได้จาก Base85  
2. ถอดจาก Base85 ได้ข้อความที่เป็น Base45  
3. ถอดจาก Base45 ได้โค้ด Malbolge  
4. นำโค้ด Malbolge ไป execute ด้วย interpreter จะทำให้ได้ Flag

<img width="1537" height="855" alt="image" src="https://github.com/user-attachments/assets/ef1c596b-4652-484e-9fda-7a3f2491b909" />
<img width="1153" height="652" alt="image" src="https://github.com/user-attachments/assets/60608c87-c67b-4fe6-bc44-bfca2f640148" />

---

## ผลลัพธ์
เมื่อนำโค้ด Malbolge ไป execute ด้วย interpreter จะได้ Flag:
```
flag{If_Y0u_Kn0w_Y07_Know_7453980724}
```

---
## เครดิต
**แนวคิดจากคุณ `ที่มรอลงอาญา (คุณ nack)` และ `ทีม PoE (คุณ Sirati)`**
