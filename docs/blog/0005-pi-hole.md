---
title:      "Pi-Hole"
date:       2025-04-23
tags:
    - Adblock & DNS
    - LXC
---

![](/img/pi-hole.png)


# Pi-Hole

## Description

Pi-hole is a free, open-source network-level advertisement and Internet tracker blocking application. It runs on a Raspberry Pi or other Linux-based systems and acts as a DNS sinkhole, blocking unwanted traffic before it reaches a user's device. Pi-hole can also function as a DHCP server, providing IP addresses and other network configuration information to devices on a network. The software is highly configurable and supports a wide range of customizations, such as allowing or blocking specific domains, setting up blocklists and whitelists, and customizing the appearance of the web-based interface. The main purpose of Pi-hole is to protect users' privacy and security by blocking unwanted and potentially malicious content, such as ads, trackers, and malware. It is designed to be easy to set up and use, and can be configured through a web-based interface or through a terminal-based command-line interface.

---

- With an option to add Unbound
- With an option to configure Unbound as a forwarding DNS server (using DNS-over-TLS (DoT)) as opposed to a recursive DNS server


## How to install

To create a new Proxmox VE Pi-Hole LXC, run the command below in the Proxmox VE Shell.

```bash [Default]
bash -c "$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/ct/pihole.sh)"
```

- To set your password, log in to the container, and type the following: 
```
pihole setpassword
```

## Default Settings

- Default Interface: `IP:80`
- 1 vCPU
- 512MB RAM
- 2 GB HDD

## Links

- [Website](https://pi-hole.net/)
- [Documentation](https://docs.pi-hole.net/)
