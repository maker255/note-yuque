import type { KnowledgeBase, TreeNode } from "./types";

// 演示 / 首次播种数据 —— 依据 2.html（语雀风格知识库视图）忠实重建。
// 2.html 的「我的知识库」面板列出 8 个知识库（均归属「我个人的」），每个含若干文档与更新时间。
// 时间统一为 ISO，便于排序与本地化展示；短日期（仅 MM-DD）按 2025 年补全。
//
// JAVA 在 2.html 中标记为 🌀（非私有），其余均为 🔒（私有）。emoji 亦遵循 2.html：JAVA 为 📗，其余 📘。

// 小工具：少写些重复字段（2.html 中文档为扁平列表，无目录/嵌套）。
const doc = (
  id: string,
  title: string,
  updatedAt: string,
  words: number,
  children: TreeNode[] = [],
): TreeNode => ({ id, type: "doc", title, updatedAt, words, children });

export const SEED_KBS: KnowledgeBase[] = [
  {
    // 依据 1.html 的「试题」侧边栏 / 文档列表忠实重建：4 篇根文档 + 2 个带子文档的父文档。
    // 全部为「空笔记」（words: 0、无正文 content），仅保留标题、层级与更新时间。
    id: "exam",
    emoji: "📘",
    name: "试题",
    locked: true,
    fav: false,
    scope: "mine",
    tree: [
      doc("e-qt", "Qt 下载教程", "2024-06-10T16:00:00", 0),
      doc("e-csharp-recursion", "C#面试常见递归算法", "2024-06-02T12:02:00", 0),
      doc("e-csharp-sort", "C#经典十大排序算法", "2024-06-03T13:58:00", 0),
      doc("e-vscode", "VScode中配置 C/C++ 环境", "2024-06-23T00:09:00", 0),
      doc("e-cpp-primer", "C++ Primer第五版中文版习题上", "2023-11-02T21:15:00", 0, [
        doc("e-gpp", "基础 g++计算题", "2024-06-03T14:03:00", 0),
        doc("e-cli-cpp", "命令行运行C++", "2023-10-30T21:48:00", 0),
        doc("e-sqllist", "sqlList顺序表", "2024-06-02T11:48:00", 0),
      ]),
      doc("e-first-cpp", "第一个 C++ 程序", "2024-05-29T22:40:00", 0, [
        doc("e-types-init", "基本类型和初始化", "2023-05-21T08:51:00", 0),
        doc("e-array-type", "数组类型", "2023-05-21T08:59:00", 0),
      ]),
    ],
  },
  {
    id: "java",
    emoji: "📗",
    name: "JAVA",
    locked: false,
    fav: false,
    scope: "mine",
    tree: [
      doc("j-regex", "正则表达式提取短信验证码", "2024-05-29T20:12:00", 1320),
      doc("j-tomcat", "Tomcat", "2024-03-14T19:33:00", 980),
      doc("j-jdk8", "JDK8环境", "2024-03-11T17:44:00", 610),
    ],
  },
  {
    id: "db",
    emoji: "📘",
    name: "数据库",
    locked: true,
    fav: false,
    scope: "mine",
    tree: [
      doc("d-asp", "asp", "2024-12-29T00:33:00", 1180),
      doc("d-mysql", "安装MySQL", "2024-11-21T13:45:00", 1530),
      doc("d-untitled", "无标题文档", "2024-11-13T02:42:00", 0),
    ],
  },
  {
    id: "math",
    emoji: "📘",
    name: "高数",
    locked: true,
    fav: false,
    scope: "mine",
    tree: [
      doc("m-sxgs", "nb的sxgs解释", "2025-03-21T13:49:00", 2010),
      doc("m-zhaosheng", "2023 年普通高等学校招生", "2025-01-14T13:50:00", 1320),
      doc("m-integral", "积分", "2024-09-22T22:28:00", 870),
    ],
  },
  {
    id: "gh",
    emoji: "📘",
    name: "GitHub收集",
    locked: true,
    fav: false,
    scope: "mine",
    tree: [
      doc("g-nas", "部署NAS（网络附加存储）", "2025-05-28T10:55:00", 1640),
      doc("g-zed", "编译 zed", "2025-05-28T10:52:00", 1280),
      doc("g-vm", "为虚拟机配置", "2025-05-27T16:52:00", 960),
    ],
  },
  {
    id: "read",
    emoji: "📘",
    name: "阅读资料",
    locked: true,
    fav: false,
    scope: "mine",
    tree: [
      doc("r-ps", "记录ps之类的应用安装", "2025-06-06T20:12:00", 540),
      doc("r-untitled", "无标题文档", "2025-04-27T22:01:00", 0),
      doc("r-ai", "ai日志", "2025-04-27T19:33:00", 2230),
    ],
  },
  {
    // 2.html「常用」面板列出，但未展开文档列表 —— 暂为空树。
    id: "android",
    emoji: "📘",
    name: "Android",
    locked: true,
    fav: false,
    scope: "mine",
    tree: [],
  },
  {
    id: "deploy",
    emoji: "📘",
    name: "部署 shell",
    locked: true,
    fav: false,
    scope: "mine",
    tree: [],
  },
];

// 新建知识库时循环取用的图标，保持单色/克制风格。
export const EMOJI_POOL = ["📕", "📗", "📘", "📙", "📓", "📔", "📒", "🗂️", "📦", "🧩", "💡", "🔧"];
