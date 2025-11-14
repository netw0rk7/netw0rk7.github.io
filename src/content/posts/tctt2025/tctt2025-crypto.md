---
title: Thailand Cyber Top Talent 2025 [OPEN] — Cryptography Writeups
published: 2025-11-14
description: "Cryptography Writeups from TCTT2025"
image: "./TCTT2025.png"
tags: ["CTF"]
category: CTF
draft: false
---

# Open‑AdvancedFactorWar [300pts] - Cryptography Write-up

## โจทย์
**Story**

คุณได้คีย์สาธารณะประหลาดที่ดูเหมือน RSA แต่ Modulus ถูกสร้างจาก **หลาย prime (multi‑prime)** 
แถมยังมีร่องรอยว่ามีการลงลายเซ็นด้วย **CRT** ที่เคยผิดพลาด และมี public key แปลก ๆ อีกสองตัว
เป้าหมายสุดท้ายคือถอดรหัส ciphertext เพื่อกู้ **FLAG**

**Files**
- **Stage 1 (Obfuscation):** `stage1_frag_*.txt` — ชุดไฟล์สับเปลี่ยนที่เข้ารหัสค่าของ N ด้วยสัญลักษณ์ (ฐาน 8)
- **Stage 2 (Hastad / Broadcast, e=3):** `stage2_pubA.pem/B.pem/C.pem` + `stage2_cA.bin/cB.bin/cC.bin` — จงกู้ข้อความบอกใบ้ (mapping + ลำดับชิ้นส่วน + ค่า e)
- **Stage 3 (GCD share):** `stage3_pub_aux1.pem`, `stage3_pub_aux2.pem` + `stage3_c_aux1.bin/c_aux2.bin` —  Modulus สองชุดที่ **แชร์ prime คนละตัว** กับ Modulus หลัก
- **Stage 4 (CRT fault):** `stage4_message.bin`, `stage4_sign_ok.bin`, `stage4_sign_faulty.bin` — ลายเซ็นถูก/ผิดของข้อความเดียวกัน ภายใต้ Modulus หลัก
- **Final:** `public_main.pem`, `final_cipher.bin` — เมื่อได้ N และรู้ e แล้ว จงถอดรหัสให้ได้ FLAG

**What to do**
1. **Stage 2 ก่อน**: ใช้ CRT รวม ciphertext ทั้งสาม (e=3, ไม่มี padding) เพื่อถอดข้อความบอกใบ้: 
   - mapping สัญลักษณ์ ↔ ดิจิตฐาน 8
   - ลำดับที่ถูกต้องของไฟล์ `stage1_frag_*.txt`
   - ค่า `E=65537`
2. **Stage 1**: ใช้ mapping + ลำดับชิ้นส่วนที่ได้ เพื่อรวมและถอดรหัสเป็นเลขฐาน 8 → แปลงเป็นจำนวนเต็ม = **N**
3. **Stage 3**: คำนวณ \( \gcd(N, N_{aux1}) \) และ \( \gcd(N, N_{aux2}) \) จะได้ prime สองตัวของ N
4. **Stage 4**: ใช้สมบัติ fault‑attack: \( \gcd(N, s_{ok} - s_{faulty}) \) จะให้ prime อีกตัวหนึ่งของ N
5. เมื่อได้ prime เพียงพอแล้ว จง factor N ให้ครบทั้งหมด → หา \(\varphi(N)\) → คำนวณ \(d = e^{-1} \bmod \varphi(N)\) → ถอดรหัส `final_cipher.bin`

**Output**
พิมพ์ FLAG ในฟอร์แมต:
```
flag{...}
```

---

## แนวคิดการแก้โจทย์
### Stage 2 จะถอด “ข้อความบอกใบ้” (Hastad e=3, No‑padding)
1. อ่าน `stage2_pubA.pem/B.pem/C.pem` กับ `stage2_cA.bin/cB.bin/cC.bin`.
2. รวมด้วย CRT คำนวณค่าหนึ่งเดียว `C` ที่ทำให้ `C ≡ cA (mod nA), C ≡ cB (mod nB), C ≡ cC (mod nC)`.
3. ตรวจว่า `C` เป็น perfect cube หรือหาค่า `m = ⌊∛C⌉` แล้วเช็คว่า `m^3 == C`. ถ้าจริง แปลว่าได้ `m` ซึ่งเป็นข้อความบอกใบ้ ซึ่งภายในจะมี
   - mapping สัญลักษณ์ → {0..7} (Digit octal),
   - ลำดับไฟล์ `stage1_frag_*.txt`,
   - ค่า `E = 65537`.
ถ้า `m^3 > N_ABC` จะไม่ใช่ perfect cube ตรง ๆ — ต้องออกแบบให้ชุด `nA, nB, nC` ใหญ่พอ (โจทย์เตรียมไว้แล้ว).

### Stage 1 ใช้ mapping + ลำดับชิ้นส่วนที่ได้ เพื่อรวมและถอดรหัสเป็นเลขฐาน 8 → แปลงเป็นจำนวนเต็ม = **N**
1. ใช้ ลำดับไฟล์ และ mapping ที่ได้จาก Stage 2 ไล่เปิด `stage1_frag_*.txt` ตามลำดับนั้น
2. แทนสัญลักษณ์ด้วยดิจิตฐาน 8 แล้วต่อกันเป็นสตริงฐาน 8 เดียว
3. แปลงฐาน 8 → จำนวนเต็ม ได้ N

### Stage 3 คำนวณ \( \gcd(N, N_{aux1}) \) และ \( \gcd(N, N_{aux2}) \) จะได้ prime สองตัวของ N
- อ่าน Modulus จาก `stage3_pub_aux1.pem`, `stage3_pub_aux2.pem` แล้วทำ
  - `p1 = gcd(N_main, N_aux1)`
  - `p2 = gcd(N_main, N_aux2)`
- แต่ละค่า `p1, p2` เป็น prime หนึ่งตัวของ N_main

### Stage 4 ใช้สมบัติ fault‑attack: \( \gcd(N, s_{ok} - s_{faulty}) \) จะให้ prime อีกตัวหนึ่งของ N
- อ่าน RSA Signature `s_ok` และ `s_faulty` (บนข้อความเดียวกัน)
- คำนวณ `G = gcd(N_main, s_ok − s_faulty)` จะให้ตัวประกอบร่วมของ N_main
- ถ้า `G` รวม prime มากกว่าหนึ่งตัว (ขึ้นอยู่กับลักษณะ fault) ให้ ตัดตัวประกอบร่วม G ด้วย prime ที่รู้แล้ว เพื่อแยกผลคูณของ prime ที่ยังไม่รู้

### Final → ถอดรหัส
1. เมื่อได้ prime เพียงพอ ให้พยายาม factor N_main
2. หา `φ(N)` และ `d = E^{-1} mod φ(N)` (หรือ) คำนวณ `d_i = E^{-1} mod (p_i − 1)` ทีละ prime แล้วรวมด้วย CRT ตอนถอดรหัส
3. อ่าน `final_cipher.bin` เป็นจำนวนเต็ม `c`
4. ถอดรหัสเป็น `m` และแปลงเป็นไบต์ → ข้อความ ASCII → FLAG

---

## อธิบาย Script
- ใช้ `openssl` ดึง Modulus จากไฟล์ `.pem` และใช้ `sympy.mod_inverse` สำหรับหาอินเวอร์สโมดูลาร์
- ดึง  Modulus หลัก N_main จาก `public_main.pem` (Hex)  
- อ่าน Modulus ของ aux1, aux2 แล้วใช้ `gcd` ดึง prime ที่แชร์กับ `N_main` ออกมา ได้ `p1`, `p2`
- อ่าน RSA Signature ถูก/ผิดของข้อความเดียวกัน แล้วใช้สมบัติของ CRT fault attack คือ
  ความแตกต่าง `s_ok − s_faulty` จะทำให้ `gcd(N_main, s_ok − s_faulty)` มีตัวประกอบร่วมกับ `N_main` ซึ่งคือ prime ที่เกี่ยวข้องกับ fault
- ในโจทย์นี้ `G` ออกมาเป็นผลคูณที่ ยังมี p1,p2 ปะปนอยู่ จึง ตัดตัวประกอบร่วมด้วย p1,p2 เพื่อเหลือ `r = p3*p5`  
- จากนั้นใช้ `N_main = p1*p2*p3*p4*p5` ⇒ เราจึงคำนวณ `p4` ได้เป็น `N_main / (p1*p2*r)`  
- ถึงตรงนี้เรามี prime อย่างน้อยสามตัว: `p1, p2, p4` (และรู้ว่ามี `p3,p5` รวมอยู่ใน `r`)  
- โหลด ciphertext เป็นจำนวนเต็ม และกำหนด `E` ตามที่บอกใบ้
- คำนวณ CRT Exponents prime (`d_i = E^{-1} mod (p_i−1)`) เพื่อถอดรหัสแบบ CRT ทีละ Modulus ย่อย
- รวมผลลัพธ์ที่ถอดได้ด้วย Chinese Remainder Theorem เพื่อได้ `m_partial` ซึ่งเป็น `m (mod p1*p2*p4)`  
- เมื่อ `0 ≤ m < p1*p2*p4` จะได้ `m_partial = m`
- แปลงจำนวนเต็มเป็นไบต์และพยายามถอดเป็นสตริง ASCII ควรได้ตาม Format คือ `flag{...}`

---

## ผลลัพธ์
เมื่อรัน Python Script พร้อมไฟล์โจทย์ จะได้ ASCII ซึ่งเป็น **FLAG** คือ
```
flag{multi_pr1me_cr4ck_by_RSA_CRT_47e1cc2ddc}
```
<img width="620" height="65" alt="image" src="https://github.com/user-attachments/assets/8a6aff58-58db-4255-8f58-ac724bb80dc5" />

