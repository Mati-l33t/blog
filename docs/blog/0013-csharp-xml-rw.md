---
title:      "C# 读取XML的三种方式"
date:       2018-01-15
tags:
    - C#
---

# C# 读取XML的三种方式

## 两种读写模型
#### DOM模型

> DOM的好处在于它允许编辑和更新XML文档，可以随机访问文档中的数据，可以使用XPath查询，但是，DOM的缺点在于它需要一次性的加载整个文档到内存中，对于大型的文档，这会造成资源问题   

#### 流模型
> 流模型很好的解决了DOM模型的性能问题，因为它对XML文件的访问采用的是流的概念，也就是说，任何时候在内存中只有当前节点，但它也有它的不足，它是只读的，仅向前的，不能在文档中执行向后导航操作。

## 三种读写方式
#### 方式一：内置DOM库 XmlDocument
MSDN传送门：<a href="https://msdn.microsoft.com/zh-cn/library/system.xml(v=vs.110).aspx">https://msdn.microsoft.com/zh-cn/library/system.xml(v=vs.110).aspx</a>
```cs
//声明Document并加载xml
XmlDocument doc = new XmlDocument();
XmlReaderSettings settings = new XmlReaderSettings();
settings.IgnoreComments = true;//忽略文档里面的注释
XmlReader reader = XmlReader.Create(@"..\..\Book.xml", settings);
doc.Load(XmlReader); //也可以不使用XMLReader,直接doc.Load(@"Path/xx.xml")或doc.LoadXML("xmlstring...")

XmlNode xn = xmlDoc.SelectSingleNode("bookstore"); //获取名为bookstore的节点
XmlNodeList nodeList = xn.ChildNodes;
foreach (XmlNode node in nodeList )
{
    XmlElement xe = (XmlElement)node; //转换为元素
    Console.WriteLine(xe.GetAttribute("ISBN").ToString()); //得到ISBN属性的值

    XmlNodeList subNodes = xe.ChildNodes;
    Console.WriteLine(subNodes.Item(0).InnerText; //第一个子节点的文本
}
reader.Close();      //使用XMLReader时注意手动关掉
```
增加删除修改节点详见 Mark：<a href="//www.cnblogs.com/a1656344531/archive/2012/11/28/2792863.html" target="_blank">//www.cnblogs.com/a1656344531/archive/2012/11/28/2792863.html</a>

#### 方式二：流式读写XmlTextReader和XmlTextWriter
API传送门 : <a href="https://msdn.microsoft.com/zh-cn/library/system.xml.xmltextreader(v=vs.110).aspx" target="_blank">https://msdn.microsoft.com/zh-cn/library/system.xml.xmltextreader(v=vs.110).aspx</a>
```cs
XmlTextReader reader = new XmlTextReader(@"..\..\Book.xml");
while (reader.Read())
{
    if (reader.NodeType == XmlNodeType.Element)
    {
        if (reader.Name == "book")  {
            reader.GetAttribute(0);
            reader.GetAttribute("ISBN");
        }
        if (reader.Name == "price")
        {
            reader.ReadElementString();
        }
    }
    if (reader.NodeType == XmlNodeType.EndElement)
    {
        //...
    }
}
```
#### 方式三：Linq to XML
强大的Linq, 万能的Linq: <a href="https://msdn.microsoft.com/zh-cn/library/system.xml.linq.xelement(v=vs.110).aspx" target="_blank">https://msdn.microsoft.com/zh-cn/library/system.xml.linq.xelement(v=vs.110).aspx</a>
```cs
XElement xe = XElement.Load(@"..\..\Book.xml");
IEnumerable<XElement> elements =
 from ele in xe.Elements("book") 
 where ele.Attribute("ISBN").Equals("XX") 
 select ele;
 
elements.Remove();
```
