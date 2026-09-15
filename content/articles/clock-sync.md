---
title: Automatic Synchronisation of Clocks and Devices
date: 2023-04
readTime: 6
type: exploratory
---

During November 2021, my friends and I went out at midnight to watch Daylight Savings Time end in real time. Taking a walk was our best strategy for staying awake for it. At the time I was more focused on the celebration than on the fact that every device in everyone's pockets adjusted its time automatically, simultaneously, without any of us doing anything. It was only while travelling to London later that I actually wondered how that works.

## The Infrastructure Behind It

### Time servers and NTP

Most devices rely on time servers to maintain accurate time. Time servers are synchronised with atomic clocks — the most accurate timekeeping devices in existence. The standard protocol for this synchronisation is NTP (Network Time Protocol), which allows devices to connect to time servers over the internet and retrieve precise time information. Most smartphones, running either Android or iOS, use NTP as their primary time reference.

### Carrier network time

Mobile phones can also receive time information from the cellular network directly. Cellular networks receive time updates from global time servers and satellites, then propagate that to connected devices. This is particularly useful when a device moves between time zones — the network can detect the change and push an update before the device has even queried an NTP server.

### GPS synchronisation

GPS satellites carry highly accurate atomic clocks. GPS receivers determine current time and location from satellite signals, accurate to within a few billionths of a second. Critical systems — air traffic control, financial trading platforms — rely on GPS time rather than NTP because the precision requirements are stricter than internet time servers can reliably provide.

### Stratum hierarchy

NTP servers are organised into stratum levels. A stratum 0 server is directly connected to a reference source like an atomic clock. Stratum 1 servers synchronise with stratum 0 servers, and the hierarchy continues to stratum 15, which represents an unsynchronised device. Devices aim to synchronise with the highest-stratum (most accurate) servers available, and can switch between sources for redundancy.

## Why Accuracy Matters Beyond Phones

Accurate time synchronisation is foundational in financial trading, where timestamps on transactions are legally and operationally significant. In telecom networks, frequency synchronisation (not just time, but the rate at which time passes as measured by the network) is required to keep components stable. In data centres, log timestamps from multiple systems need to be consistent enough to reconstruct event sequences accurately during an incident.

DST handling is built into most time servers — they're aware of regional daylight saving rules and propagate the adjustment automatically. The device doesn't need to know when DST starts or ends for its region; the server tells it.

---

Random airport musings aside: the fact that this works seamlessly, globally, across billions of devices simultaneously is one of those pieces of infrastructure that becomes invisible precisely because it works so well. The midnight walk was a good excuse to think about it.
