---
title:      "Proxmox VE Post Install"
date:       2025-04-22
tags:
    - Proxmox & Virtualization
    - PVE
---

![](/img/pve-logo.png)


# Proxmox VE Post Install

## Description

This script provides options for managing Proxmox VE repositories, including disabling the Enterprise Repo, adding or correcting PVE sources, enabling the No-Subscription Repo, adding the test Repo, disabling the subscription nag, updating Proxmox VE, and rebooting the system.



## How to use

To use the Proxmox VE Post Install script, run the command below **only** in the Proxmox VE Shell. This script is intended for managing or enhancing the host system directly.

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/tools/pve/post-pve-install.sh)"
```
