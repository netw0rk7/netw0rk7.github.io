---
title: Thailand Cyber Top Talent 2025 [OPEN] — Cryptography
published: 2025-11-14
description: "Cryptography Writeups from TCTT2025"
tags: ["CTF","Cryptography"]
category: CTF
draft: false
---

Github : https://github.com/netw0rk7/Thailand-Cyber-Top-Talent-2025-Writeup/tree/ctf/Crypto

---

# Bad62 [100 pts] - Cryptography Write-up

## โจทย์

มันคือการเข้ารหัส Bad62 ที่แสนเลวร้ายของฉัน
**หมายเหตุ** รูปแบบของ Flag ที่เป็นคำตอบของข้อนี้คือ **flag{message_10digits}**

โค้ดเข้ารหัสที่ใช้จริง (bad62.py)
```python
import base62

flag = input('Flag: ')
encoded = base62.encodebytes(flag.encode())
print(encoded.lower())
```

ข้อมูลที่ได้จากการ Encode (enc.txt)
```
cbm6okchgcvxtifbvfd68lmyh38nqxnjxmdtbathtougtkxdmwux9tcmo6rs0j7uuf
```

---

## ข้อสังเกต
- Base62 ปกติ จะมีค่า digit ดังนี้:
  - `'0'..'9'` = 0..9  
  - `'A'..'Z'` = 10..35  
  - `'a'..'z'` = 36..61
- เมื่อบังคับ `.lower()` ส่งผลให้
  - ตัวเลขไม่เปลี่ยนค่า digit 
  - ตัวอักษรพิมพ์เล็กไไม่เปลี่ยนค่า digit
  - **ตัวใหญ่แปลงเป็นเป็นตัวเล็กทำให้ ค่าดิจิตเพิ่มขึ้น 26**

---

## แนวคิดการแก้โจทย์
1. ถอด `M0` จากสตริงตัวเล็กล้วน  
2. หาตำแหน่งตัวอักษรทั้งหมดที่อาจเป็นตัวใหญ่) 
3. สำหรับแต่ละตำแหน่งคำนวณ “ค่าที่ควรลบออก” = 26 × 62^(N−1−i)  
4. ใช้ **Beam Search**:
   - แบ่งตำแหน่งเป็นก้อนเล็ก ๆ (group_size=6)  
   - ทุกก้อนลองเลือก subset (2^6=64 แบบ) ว่าจะ “ลบหรือไม่ลบ”  
   - ให้คะแนนจาก:
     - จำนวน Byte ASCII ที่พบ (ASCII 32..126)  
     - Prefix ตรง `flag{`  
   - เก็บเฉพาะสถานะที่คะแนนสูงสุด 
5. เมื่อเดินครบทุกกลุ่ม ลองแปลงแต่ละชุดที่พบ กลับเป็น ASCII และหา `flag{...}` ด้วย regex  

---

## อธิบาย Script
- `base62_decode(s)` จะถอด Base62 เป็นจำนวนเต็ม  
- `to_bytes_be(n,L)` ทำการแปลงเป็นไบต์ big-endian ความยาว L  
- `is_printable_ascii(bs)` ให้คะแนน ASCII ที่อ่านได้  
- `prefix_bonus(bs)` เช็ค prefix ที่เริ่มด้วย `flag{`  
- `try_decode_ascii(M,L_guess)` → ลองหลายความยาว หา Flag ด้วย regex  
- `solve_bad62_head(encoded)` → อัลกอริทึม beam search

```python
ALPH = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
VAL = {c: i for i, c in enumerate(ALPH)}
BASE = 62

def base62_decode(s: str) -> int:
    v = 0
    for ch in s:
        v = v * BASE + VAL[ch]
    return v

def to_bytes_be(n: int, L: int) -> bytes:
    b = bytearray(L)
    for i in range(L - 1, -1, -1):
        b[i] = n & 0xFF
        n >>= 8
    return bytes(b)

def is_printable_ascii(bs: bytes) -> int:
    score = 0
    for b in bs:
        if 32 <= b <= 126:
            score += 1
    return score

def prefix_bonus(bs: bytes, tgt=b"flag{") -> int:
    m = min(len(bs), len(tgt))
    bonus = 0
    for i in range(m):
        if bs[i] == tgt[i]:
            bonus += 5
    return bonus

def try_decode_ascii(M: int, L_guess: int):
    import re
    for dL in (-2, -1, 0, 1, 2, 3):
        L = max(1, L_guess + dL)
        bs = to_bytes_be(M, L)
        try:
            s = bs.decode('ascii')
        except:
            continue
        if re.fullmatch(r"^flag\{.*_[0-9]{10}\}$", s):
            return s
        m = re.search(r"flag\{[^}]+\}", s)
        if m:
            return m.group(0)
    return None

def solve_bad62_head(encoded: str, group_size=6, keep_top=2000):
    N = len(encoded)

    letter_positions = []
    for i, c in enumerate(encoded):
        if c.isalpha():
            letter_positions.append(i)

    pow62 = [1] * (N + 1)
    for k in range(1, N + 1):
        pow62[k] = pow62[k - 1] * BASE

    diffs = {}
    for i in letter_positions:
        diffs[i] = 26 * pow62[N - 1 - i]

    M0 = base62_decode(encoded)

    L_guess = (M0.bit_length() + 7) // 8
    if L_guess < 1:
        L_guess = 1

    groups = []
    pos_sorted = sorted(letter_positions)
    for i in range(0, len(pos_sorted), group_size):
        groups.append(pos_sorted[i:i + group_size])

    states = [(0, 0)]

    for g_index, grp in enumerate(groups):
        adds = [0]
        for p in grp:
            d = diffs[p]
            new_adds = []
            for a in adds:
                new_adds.append(a)
                new_adds.append(a + d)
            adds = new_adds

        head_need = min(L_guess, (g_index + 1) * group_size)

        new_states = []
        for (old_score, total_sub) in states:
            base_val = M0 - total_sub
            if base_val <= 0:
                continue
            for add in adds:
                M = base_val - add
                if M <= 0:
                    continue
                bs = to_bytes_be(M, L_guess)
                head = bs[:head_need]
                s = is_printable_ascii(head) + prefix_bonus(head)
                new_states.append((s, total_sub + add))

        new_states.sort(key=lambda x: x[0], reverse=True)
        states = new_states[:keep_top]

    for (score, total_sub) in states:
        M = M0 - total_sub
        flag = try_decode_ascii(M, L_guess)
        if flag:
            return flag

    return None

if __name__ == "__main__":
    enc = "cbm6okchgcvxtifbvfd68lmyh38nqxnjxmdtbathtougtkxdmwux9tcmo6rs0j7uuf"
    ans = solve_bad62_head(enc, group_size=6, keep_top=2000)
    print(ans)
```
---

## ผลลัพธ์
เมื่อรัน Python Script และใช้ข้อมูลตามไฟล์ enc.txt จะได้ Flag:
```
flag{t0day_1s_n07_g00d_bu7_1ts_s0_b@d_1467297483}
```
<img width="517" height="63" alt="image" src="https://github.com/user-attachments/assets/5c1a7d10-2751-4a47-9799-e3b1ed7da73c" />

---

# Advanced Strings Secret (100 pts) - Cryptography Write-up
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

---

# NewBase64 [200pts] - Cryptography Write-up
## โจทย์
นี่มันคือการเข้ารหัส Base64 แบบใหม่ใช่หรือไม่

**หมายเหตุ** รูปแบบของ Flag ที่เป็นคำตอบของข้อนี้คือ **flag{message_10digits}**

ไฟล์ base64.py
```python
def char_gen():
    char = [chr(i) for i in range(ord('ก'), ord('ก') + 47)]
    char += [chr(i) for i in range(ord('๐'), ord('๐') + 10)]
    char += [chr(i) for i in range(ord('0'), ord('0') + 10)]
    char = char[:64]
    return char

def char_to_hex(msg):
    hex_data = ''
    for c in msg.encode():
        hex_data += hex(c)[2:]
    return hex_data

def base64_encode(msg):
    char = char_gen()
    msg = char_to_hex(msg)
    msg_num = eval('0x' + msg)
    base64 = ''
    while msg_num > 0:
        base64 = char[msg_num % 64] + base64
        msg_num = msg_num // 64
    
    base64 += '=='
    return base64

msg = input('Message: ')
base64 = base64_encode(msg)
open('enc.txt', 'wb').write(base64.encode('utf-16'))
```

ไฟล์ enc.txt
```
ฒ๗4๐บฃขหผ๗ฉยฉจฒษปธญมปธญมพงยฦฉงบอนทฝมบว4๓ฉจฦ๐พณขวผงฆศฟ๗ฝ๑ญงฒภปฤขรธ๘ฒษญธฎภญธฎภพงม๔ธ๗๙๔พ๖4ฃฑจฎฦฎฤฒภฎฤฑ๑ญคก๗ฎคก๑ญจ๕มฉณฅยฉ๓ญฤ==
```


---

## ข้อสังเกต
- ตัวอักษรที่ใช้มี 64 ตัว 
- กระบวนการเข้ารหัส:
  1. แปลงข้อความเป็น Hex  
  2. แปลง Hex เป็น Integer  
  3. แปลง Integer เป็น Custom Base64 ด้วย Alphabet ข้างต้น  
  4. เติม "==" ท้ายข้อความ และบันทึกเป็น UTF-16  

---

## แนวคิดการแก้โจทย์
1. ไฟล์ `enc.txt` เป็นแบบ UTF-16  
2. ตัด "==" ทิ้ง  
3. แปลงจาก Custom Base64 กลับไปเป็น Integer  
4. แปลง Integer กลับไปเป็น Hex String  
5. แปลง Hex String กลับไปเป็น Bytes และ Decode
6. ได้ข้อความที่มี **flag** อยู่ภายใน

---

## อธิบาย Script

- `make_alphabet()` : สร้างชุดอักษร Custom Base64 64 ตัว  
- `custom64_to_int(s)` : แปลงสตริงเข้ารหัสเป็นจำนวนเต็มฐาน 10  
- `decode_custom_base64(enc_text)` :  
  1. ตัด "=="  
  2. แปลงสตริงเป็นจำนวนเต็ม  
  3. แปลงเป็นเลขฐาน 16  
  4. ถ้าความยาว hex เป็นเลขคี่ และเติม 0 ด้านหน้า  
  5. ใช้ `bytes.fromhex()` เพื่อแปลงกลับเป็นข้อความ UTF-8  
- อ่านไฟล์ `enc.txt` โดยตรง แล้วพิมพ์ผลลัพธ์ออกมา
```python
def make_alphabet():
    chars = [chr(i) for i in range(ord('ก'), ord('ก') + 47)]   # ก... (47 ตัว)
    chars += [chr(i) for i in range(ord('๐'), ord('๐') + 10)]  # ๐-๙ (10 ตัว)
    chars += [chr(i) for i in range(ord('0'), ord('0') + 10)]  # 0-9 (10 ตัว)
    return chars[:64]

ALPHABET = make_alphabet()
ALPH2VAL = {c: i for i, c in enumerate(ALPHABET)}

def custom64_to_int(s):
    value = 0
    for ch in s:
        if ch not in ALPH2VAL:
            raise ValueError(f"Alphabet NOT FOUND IN: {ch!r}")
        value = value * 64 + ALPH2VAL[ch]
    return value

def decode_custom_base64(enc_text):
    if enc_text.endswith("=="):
        enc_text = enc_text[:-2]
    n = custom64_to_int(enc_text)
    hex_str = format(n, "x")
    if len(hex_str) % 2 == 1:
        hex_str = "0" + hex_str
    data = bytes.fromhex(hex_str)
    return data.decode("utf-8", errors="replace")

if __name__ == "__main__":
    import pathlib

    enc_path = pathlib.Path("enc.txt")
    enc_text = enc_path.read_text(encoding="utf-16").strip()
    result = decode_custom_base64(enc_text)
    print(result)
```
---

## ผลลัพธ์
เมื่อรัน Python Script และใช้ข้อมูลตามไฟล์ enc.txt จะได้ข้อความ:
```
Good job! this is the flag for you flag{g00d_j0b_th1s_1s_th3_n3w_B@se64_6400064000} !!!###
```
<img width="735" height="65" alt="image" src="https://github.com/user-attachments/assets/64201265-c9db-4ed6-84a3-366aab5fd657" />

ดังนั้น Flag คือ
```
flag{g00d_j0b_th1s_1s_th3_n3w_B@se64_6400064000}
```

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

---