---
title:      "All Templates"
date:       2025-04-22
tags:
    - Proxmox & Virtualization
    - ADDON
---

![](/img/pve-logo.png)


# All Templates

## Description

A script designed to allow for the creation of one of the many free LXC templates. Great for creating system LXCs. The script creates a `*.creds` file in the Proxmox root directory with the password of the newly created LXC. Please take note that if you plan to use this script for creating TurnKey LXCs, you'll need to modify the hostname after creation.


## How to apply

This script enhances an existing setup. You can use it inside a running LXC container or directly on the Proxmox VE host to extend functionality with All Templates.

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/tools/addon/all-templates.sh)"
```
