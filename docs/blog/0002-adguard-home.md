---
title:      "AdGuard Home"
date:       2025-04-23
tags:
    - Adblock & DNS
    - LXC
---

![](/img/adguard-home.png)


# AdGuard Home

## Description

AdGuard Home is an open-source, self-hosted network-wide ad blocker. It blocks advertisements, trackers, phishing and malware websites, and provides protection against online threats. AdGuard Home is a DNS-based solution, which means it blocks ads and malicious content at the network level, before it even reaches your device. It runs on your home network and can be easily configured and managed through a web-based interface. It provides detailed statistics and logs, allowing you to see which websites are being blocked, and why. AdGuard Home is designed to be fast, lightweight, and easy to use, making it an ideal solution for home users who want to block ads, protect their privacy, and improve the speed and security of their online experience.



## How to install

To create a new Proxmox VE AdGuard Home LXC, run the command below in the Proxmox VE Shell.

::: code-group

```bash [Default]
bash -c "$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/ct/adguard.sh)"
```

```bash [Alpine Linux]
bash -c "$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/ct/alpine-adguard.sh)"
```

:::


## Default Settings

- Default Interface: `IP:3000`
Default
- 1 vCPU
- 512MB RAM
- 2 GB HDD

Alpine
- 1 vCPU
- 256MB RAM
- 1 GB HDD

## Links

- [Website](https://adguard.com/en/adguard-home/overview.html)
- [Documentation](https://github.com/AdguardTeam/AdGuardHome/wiki/Getting-Started)
