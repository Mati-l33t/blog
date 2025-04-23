---
title:      "NPMplus"
date:       2025-04-23
tags:
    - Webservers & Proxies
    - LXC
---

![](/img/npmplus.png)


# NPMplus

## Description

NPMplus is an enhanced version of Nginx Proxy Manager. It simplifies the process of setting up reverse proxies with TLS termination through a user-friendly web interface. Key features include HTTP/3 support, integration with CrowdSec IPS, inclusion of GoAccess for real-time log analysis, and support for ModSecurity with the Core Rule Set.

---

- This uses Docker under the hood, as this can not easily be installed bare-metal.
- The initial starting process can be take 1-2min.


## How to install

To create a new Proxmox VE NPMplus LXC, run the command below in the Proxmox VE Shell.

```bash [Default]
bash -c "$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/ct/npmplus.sh)"
```

- Application credentials: 
```
cat /opt/.npm_pwd
```

## Default Settings

- Default Interface: `IP:81`
- 1 vCPU
- 512MB RAM
- 3 GB HDD

## Links

- [Website](https://github.com/ZoeyVid/NPMplus)
