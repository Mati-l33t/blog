---
title:      "[DevOps] 3分钟给Nginx开启HTTPS与HTTP2"
date:       2019-03-11
tags:
    - https
    - http2
---

由于种种不可抗力以及晚期懒癌的影响，很久没更新博客了，这篇也偷个懒写一篇没什么营养，但很实用的小技巧

## Let's Encrypt
HTTPS + HTTP2 已经是大势所趋，对于个人用户，[OV、EV](https://www.cnblogs.com/sslwork/p/6193256.html)的HTTPS证书无法获取，通常用免费的DV证书来实现HTTPS，其中[Let's Encrpyt](https://letsencrypt.org/)的证书是最易用的，具体流程如下：

### 安装CertBot并创建证书

[CertBot](https://certbot.eff.org/)提供了自动化的方式管理HTTPS证书，但通过实践发现太过自动化反而失去了灵活性，比如我的Nginx部署在容器环境中，宿主机并没有Nginx，就需要手动生成证书了,假设域名为domain.com，下面以CentOS为例生成证书。

```bash
yum install certbot
# 使用这条命令之前，首先在云服务商后台，将域名解析到执行这条命令的机器IP
# 这里 /webroot-path 需要替换，每个子域名都需要添加一个 -d， 下面再讲解这条命令详细含义
certbot certonly --webroot -w /webroot-path -d domain.com -d  www.domain.com
```

certonly模式需要指定一个webroot, 这个目录用于certbot写入域名验证信息，让certbot知道通过这些域名，确实能访问到这台机器，并且访问到的内容与预期一致，因此，这个webroot目录顾名思义，就是静态资源服务器的资源目录。

certbot会在里面写入 **./.well-known/acme-challenge/** 用于验证，验证完了就删除，webroot参数填写资源目录路径即可，比如：
- Nginx的 root 配置路径，如 /usr/share/nginx/html
- Java应用的webapp、static resource 资源目录， nodejs的 static 中间件对应目录等等

某些云服务商提供的TLS证书服务通常是用DNS验证，比如添加一条TXT记录等等，certbot也有多种方式，但感觉最简单的办法就是 "certbot certonly",正确的输出包含"Congratulations"即通过验证，证书会放在 **/etc/letsencrypt**下面，**/etc/letsencrypt/live**文件夹中存放的最新证书的软链接。

### 证书自动续期
Lets Encrypt的证书有效时间只有90天，因此certbot提供了renew命令用于自动续期，添加crontab即可一劳永逸

```bash
# crontab -e, 然后插入下面的命令，每周一两点自动检查续期
00 2 * * 1 /usr/bin/certbot renew --webroot -w /webroot-path >> /var/log/le-renew.log
```

不放心可以先 dry run 看下是否正常，看到下面的输出就是正常的
```bash
/usr/bin/certbot renew --dry-run --webroot -w /webroot-path

#** DRY RUN: simulating 'certbot renew' close to cert expiry
#**          (The test certificates below have not been saved.)
#
#Congratulations, all renewals succeeded. The following certs have been #renewed:
#  /etc/letsencrypt/live/domain.com/fullchain.pem (success)
# ......
```

## Nginx配置证书及Http2
上面通过certbot生成免费证书，配置到Nginx的443 Server模块即可，至于Http2，网上有很多教程还是添加Nginx模块来搞Http2，但Nginx在1.9.5之后就原生支持Http2了，仅需几行即可开启Http2，新版本的OpenSSL也支持TLS1.3

```
# 假设域名为domian.com
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name domain.com;
    root /usr/share/nginx/html;

    ssl_certificate /etc/letsencrypt/live/domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/domain.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/domain.com/chain.pem;
    
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH;
}
```

添加好HTTPS+HTTP2的Server模块后，nginx -t 验证没问题就可以重启Nginx或reload配置了，如果需要禁用HTTP，在80端口的Server模块添加一个rewrite即可,并添加一个HSTS的header防止SSL剥离攻击：
```
add_header Strict-Transport-Security "max-age=63072000; includeSubdomains; preload";
location / {
    rewrite ^ https://$http_host$request_uri? permanent;
}
```