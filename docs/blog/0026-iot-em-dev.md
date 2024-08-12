---
title:      "[Geek之路] 自己动手做智能家居(二)智能门窗感应器的开发"
date:       2018-04-25
tags:
    - IoT
---

# [Geek之路] 自己动手做智能家居(二)智能门窗感应器的开发

> 2020年8月更新: 这两年对嵌入式方向的学习太少了，回过头看两年前做的东西，虽然模块连到一起通过一些简单的代码能跑起来，但没有产品化的思维，不具有实用价值。智能家居有Home Assistant这么强大的轮子，作为一个不专业人士从头自己做太不划算了，后面还会继续学习这方面的知识，慢慢摸索。但应该要有一些产品思维，把东西做成能用的，而不仅是简单能跑的。

上一篇[架构设计与技术选型](/blog/0025-iot-design)中, 已经完成了大致的软硬件框架设计, 这节开始记录嵌入式开发的过程.
## 模块引脚与电路接线
首先嵌入式设备这块有4个硬件:
- **Wifi模块**: 承担数据处理和收发的重任, 整个门窗感应器设备的**核心**(**ESP8266-01S只要9块8, 超强Wifi模块带回家**)
- **干簧管模块**: 经过模转数封装的干簧管传感器, Digital Output直接输入TTL电平. 磁铁距离约**1.5cm以内时输出低电平**, 磁铁距离**超过阈值输出高电平**(**只要2块钱一个, 配上一个3毛钱的钕铁硼磁铁就开袋即食**)
- **蜂鸣器模块**: 当干簧管模块输出高电平时, 即门被打开时, 中间那个引脚应该**输入PWM波**让蜂鸣器鸣叫(买的是3引脚无源蜂鸣器, **只要8毛钱一个**)    

电路仿真软件Proteus里面没有Wifi模块, 也找不到3脚蜂鸣器, 这里拿纸笔画了个很不专业的线路图, 包括了每个模块的引脚接线方法. 其中ESP8266-01S有两个GPIO引脚, 作用如下:
- GPIO0用作系统的输入, 感受来自干簧管传感器的电平
- GPIO2用作系统的输出, 控制输出PWM波来让蜂鸣器沉默或发出不同的声音(更正一下: GPIO2应该连接三脚蜂鸣器的S端, 中间的引脚连接5V电源, 这里笔误了)
![circuit](//filecdn.code2life.top/iot-door-sensor-ct.jpg)   

## 固件烧录
ESP8266-01S这款神奇的元件, 8Mb的Flash, 最高160MHz的32位CPU, 功耗最低20μA, IEEE 802.11b/g/n都支持 ,甚至还能当路由器, 竟然只要**10块钱不到**. 文档在[这里](//wiki.ai-thinker.com/esp8266)都能查到, 非常齐全. 相关的工具和SDK在[这里](//wiki.ai-thinker.com/tools)都能下载到最新版本. 之前只烧录过Arduino的AVR单片机和51单片机, 这块神奇的板子还没试过自己写固件烧进去, 于是先依葫芦画瓢烧一个HelloWorld试试.   

#### 环境准备
第一步是通过UART连接串口到电脑上, 原料: **USB转TTL模块**一只(**最好是FT232RL的芯片**, 据说更稳定), 杜邦线若干. 接线如下:  
- ESP8266 RXD -> USB转串口模块 TXD
- ESP8266 TXD -> USB转串口模块 RXD
- ESP8266 GND USB转串口模块 GND -> 共地
- ESP8266 VCC -> 3.3V电源
- USB转串口模块 USB -> 计算机USB

这个时候用串口软件, 设置为**74880**的波特率, 模块上电就能看到串口输出了. 一般使用的**115200**波特率会导致串口看到的启动信息是乱码(貌似和ESP板子里的26M晶振有关), 115200波特率看到的启动信息大概是这样的， 这时可以给串口发送AT指令连接Wifi或是建立无线热点等等
![serial](//filecdn.code2life.top/8266-serial-1.jpg)

**如果把GPIO0接地拉低, 重新上电或复位就能看到上图最后一行那样的乱码, 这样是进入了下载模式**, 后面烧录固件的时候, 都是需要把**GPIO0拉低再上电复位的**.

#### 工程编译和程序烧录
从官网下载的一体化SDK就包括了默认的很多示例项目, 工程目录的结构在下图中用红字标注了. SDK有**NonOS和RTOS**两种, 一般选择NonOS即可, RTOS则类似于μcOSII这样的根据时间片和任务优先级调度多任务的**实时操作系统**固件, 这个简单的应用还用不到.
![ec](//filecdn.code2life.top/iot-project-esp8266-1.jpg)

先把HelloWorld工程执行**Clean Project, Build Project**, 编译成功后开烧. 期间也经历过一些波折, 用了技术交流群里的老版本烧录工具, 报了一些莫名奇妙的错误. 最后还是在官网找的资料和工具靠谱, 烧录成功了. 配置如下图所示, 亦可**合并**成一个大的hex直接从0x00烧进去.  
![sl](//filecdn.code2life.top/8266-flash-1.jpg)

## 程序编写
基础环境和编译烧录都打通了, 开始撸起袖子写代码了. SDK提供的示例非常丰富, 我选择**在mqtt示例的基础上开发**. 相关代码放到Github中了, [地址是这里](https://github.com/Code2Life/HarmonyIOT), 在官网工具页面上下载安装好一体化SDK并把mqtt示例的项目替换成Github此目录下的Eclipse项目即可.  

整体的设计逻辑是这样的:
1. **重写MQTT连接成功以及订阅事件的回调函数**
  - 连接上MQTT Broker时, 发送设备上线消息
  - 订阅设备开关命令, 并根据开关调用蜂鸣器的开关函数
2. **实现蜂鸣器开关函数**
  - 蜂鸣器关, GPIO2的PWM波占空比设置为0
  - 蜂鸣器开, GPIO2的PWM波占空比设置为100
3. **设置一个定时器, 每隔500ms检测一次干簧管传感器的电平**
  - 低电平即门正常关闭状态: 重置一些状态变量
  - 高电平即门打开状态: 调用蜂鸣器开函数, 如果鸣叫超过1分钟不做处理
4. **定时器每运行60次即30秒, 向MQTT Broker发布一条设备在线消息**


下面贴一下user_main.c中的关键代码, 基本上完全的面向过程编程
```c
#include "ets_sys.h"
#include "driver/uart.h"
#include "osapi.h"
#include "mqtt.h"
#include "wifi.h"
#include "pwm.h"
#include "config.h"
#include "debug.h"
#include "gpio.h"
#include "user_interface.h"
#include "mem.h"

#define INTERVAL 500
#define INIT_DELAY 10000
#define HEART_BEAT 60 //30s
#define BEEP_DURATION 120 //60s

#define PWM_PERIOD 500 //500ns
#define PWM_DUTY 100
#define PWM_IDLE 0

//传感器检测标识, 每次触发定时器自增长
LOCAL uint64_t id = 0;
LOCAL bool beeping = false;
LOCAL bool beepTimes = 0;
LOCAL bool remoteControl = false;

MQTT_Client mqttClient;
os_timer_t sensor_timer;
os_timer_t beep_timer;

//生成PWM波的GPIO2
uint32 io_info[][3] = {{PERIPHS_IO_MUX_GPIO2_U,FUNC_GPIO2,2}};
//PWM波占空比
uint32 pwm_duty_init[1] = {PWM_IDLE};

/***
 * 控制无源蜂鸣器打开和关闭
 * 在GPIO2上生成PWM, GPIO模拟PWM
 */
void beep(bool isBeep) {
  beeping = isBeep;
  if(isBeep) {
    if(beepTimes < BEEP_DURATION) {
      os_printf("PWM -> Beep \r\n");
      pwm_set_duty(PWM_DUTY, 0);
      pwm_start();
    } else {
      os_printf("PWM -> Stop Beep \r\n");
      pwm_set_duty(PWM_IDLE, 0);
      pwm_start();
    }
  } else {
    os_printf("PWM 0 -> No Beep \r\n");
    pwm_set_duty(PWM_IDLE, 0);
    pwm_start();
  }
}

/**
 * 获取数据以及处理逻辑
 * 1. 获取GPIO0电平
 * 2. 高电平触发蜂鸣器
 * 3. mqtt发送数据到服务器
 * 4. 每60次检测(30s), 触发一次心跳健康检测
 * */
void handleSensor(void) {
  id++;
  os_timer_disarm(&sensor_timer);

  //设备心跳检测
  if(id % HEART_BEAT == 0) {
    MQTT_Publish(&mqttClient, "/device/heartbeat", "DOOR_SENSOR", 11, 1, 0);
  }

  //获取GPIO0输入并判断
   uint8 sensor_res = GPIO_INPUT_GET(GPIO_ID_PIN(0));

  //门被打开(干簧管无磁)的状态
  if(sensor_res != 0) {
    beepTimes++;
    if(beeping == false && remoteControl == false) {
      os_printf("Door Opened!...\r\n");
      beep(true);
      MQTT_Publish(&mqttClient, "/device/data", "DOOR_SENSOR::door_open", 11, 1, 0);
    }
  } else {
    //若门开通过远程控制不要叫, 关门后1分钟, 远程控制失效
    //若门关状态远程控制报警, 1分钟后也失效回归平静
    if(remoteControl) {
      beepTimes++;
      if(beepTimes >= BEEP_DURATION) {
        remoteControl = false;
      }
    } else {
      beepTimes = 0;
    }

    if(beeping == true && remoteControl == false) {
      os_printf("Door Closed!...\r\n");
      beep(false);
      MQTT_Publish(&mqttClient, "/device/data", "DOOR_SENSOR::door_close", 11, 1, 0);
    }
  }
  os_timer_setfn(&sensor_timer, (os_timer_func_t *)handleSensor, NULL);

  os_timer_arm(&sensor_timer, INTERVAL, 1);
}


/**
 * 干簧管传感器数据获取定时器, 500ms触发一次
 * */
void initSensor() {

  PIN_FUNC_SELECT(PERIPHS_IO_MUX_GPIO0_U, FUNC_GPIO0);
  os_printf("Sensor READY\r\n");

  //初次启动等待wifi和mqtt初始化完毕再检测传感器
  os_timer_disarm(&sensor_timer);
  os_timer_setfn(&sensor_timer, (os_timer_func_t *)handleSensor, NULL);
  os_timer_arm(&sensor_timer, INIT_DELAY, 1);
}


void wifiConnectCb(uint8_t status)
{
  if(status == STATION_GOT_IP){
    MQTT_Connect(&mqttClient);
  } else {
    MQTT_Disconnect(&mqttClient);
  }
}
void mqttConnectedCb(uint32_t *args)
{
  MQTT_Client* client = (MQTT_Client*)args;
  os_printf("MQTT: Connected\r\n");

  //发布设备上线注册消息
  MQTT_Publish(client, "/device/online", "DOOR_SENSOR", 11, 2, 0);
  //订阅开关命令
  MQTT_Subscribe(client, "/device/on", 1);
  MQTT_Subscribe(client, "/device/off", 1);
}

void mqttDisconnectedCb(uint32_t *args)
{
  MQTT_Client* client = (MQTT_Client*)args;
  os_printf("MQTT: Disconnected\r\n");
}

void mqttPublishedCb(uint32_t *args)
{
  MQTT_Client* client = (MQTT_Client*)args;
  os_printf("MQTT: Published\r\n");
}

void mqttDataCb(uint32_t *args, const char* topic, uint32_t topic_len, const char *data, uint32_t data_len)
{
  char *topicBuf = (char*)os_zalloc(topic_len+1),
      *dataBuf = (char*)os_zalloc(data_len+1);

  MQTT_Client* client = (MQTT_Client*)args;

  os_memcpy(topicBuf, topic, topic_len);
  topicBuf[topic_len] = 0;

  os_memcpy(dataBuf, data, data_len);
  dataBuf[data_len] = 0;

  os_printf("Receive topic: %s, data: %s \r\n", topicBuf, dataBuf);

  //订阅数据的回调, 用于远程控制
  if(os_strncmp(topicBuf, "/device/on", 10) == 0) {
    os_printf("Remote control -> on. \r\n");
    remoteControl = true;
    beep(true);
  }
  if(os_strncmp(topicBuf, "/device/off", 11) == 0) {
    os_printf("Remote control -> off. \r\n");
    remoteControl = true;
    beep(false);
  }

  os_free(topicBuf);
  os_free(dataBuf);
}


/******************************************************************************
 * FunctionName : user_rf_cal_sector_set
 * Description  : SDK just reversed 4 sectors, used for rf init data and paramters.
 *                We add this function to force users to set rf cal sector, since
 *                we don't know which sector is free in user's application.
 *                sector map for last several sectors : ABCCC
 *                A : rf cal
 *                B : rf init data
 *                C : sdk parameters
 * Parameters   : none
 * Returns      : rf cal sector
 *******************************************************************************/
uint32 ICACHE_FLASH_ATTR
user_rf_cal_sector_set(void)
{
    enum flash_size_map size_map = system_get_flash_size_map();
    uint32 rf_cal_sec = 0;
    
    switch (size_map) {
        case FLASH_SIZE_4M_MAP_256_256:
            rf_cal_sec = 128 - 5;
            break;
            
        case FLASH_SIZE_8M_MAP_512_512:
            rf_cal_sec = 256 - 5;
            break;
            
        case FLASH_SIZE_16M_MAP_512_512:
        case FLASH_SIZE_16M_MAP_1024_1024:
            rf_cal_sec = 512 - 5;
            break;
            
        case FLASH_SIZE_32M_MAP_512_512:
        case FLASH_SIZE_32M_MAP_1024_1024:
            rf_cal_sec = 1024 - 5;
            break;
            
        default:
            rf_cal_sec = 0;
            break;
    }
    
    return rf_cal_sec;
}


void user_init(void)
{
  uart_init(BIT_RATE_115200, BIT_RATE_115200);
  os_delay_us(1000000);

  CFG_Load();

  MQTT_InitConnection(&mqttClient, sysCfg.mqtt_host, sysCfg.mqtt_port, sysCfg.security);
  MQTT_InitClient(&mqttClient, sysCfg.device_id, sysCfg.mqtt_user, sysCfg.mqtt_pass, sysCfg.mqtt_keepalive, 1);

  MQTT_InitLWT(&mqttClient, "/lwt", "offline", 0, 0);
  MQTT_OnConnected(&mqttClient, mqttConnectedCb);
  MQTT_OnDisconnected(&mqttClient, mqttDisconnectedCb);
  MQTT_OnPublished(&mqttClient, mqttPublishedCb);
  MQTT_OnData(&mqttClient, mqttDataCb);

  WIFI_Connect(sysCfg.sta_ssid, sysCfg.sta_pwd, wifiConnectCb);

  os_printf("\r\nSystem started ...\r\n");

  //初始化PWM
  pwm_init(PWM_PERIOD,  pwm_duty_init , 1 ,io_info);
  set_pwm_debug_en(0);
  pwm_start();
  os_printf("PWM START\r\n");

  //初始化MQTT client, 发布设备注册消息, 订阅设备开关命令消息及回调
  //GPIO0 监听干簧管电位, 高电位触发GPIO2
  //GPIO2 生成PWM激活蜂鸣器
  //MQTT client 发布警告消息通知MQTT broker
  initSensor();
}
```
这个代码是调试过的版本了, 按照设计的接线和这些代码编译的固件, 实现了预期功能. **磁铁一碰上就会滴滴滴~的叫, 远程一条MQTT消息就可以控制蜂鸣器**, 挺有意思的.   

好久没写C语言了, 写起来感觉距离机器很近. **一次又一次接线、烧录、调试**结束了, 还因为VCC-GND接反报废了一只干簧管, 终于完成嵌入式的部分了, 下节准备记录下后端开发.
