import type { KnowledgeBase, TreeNode } from "./types";

// UI 设计阶段的演示数据。脱胎于 1.html / 2.html 的样本内容，
// 结构化为「知识库 + 无限级知识树」。时间统一为 ISO，便于排序与本地化展示。
//
// ★ 关键演示：文档(doc) 与 目录(folder) 地位完全平等 —— 下方多处出现
//   「type: 'doc' 却带 children」的节点（例如《C++ Primer 习题上》《第一个 C++ 程序》），
//   证明任何文章都能作为父节点继续挂载子节点，实现与语雀一致的无限级结构。

// 小工具：少写些重复字段。
const doc = (
  id: string,
  title: string,
  updatedAt: string,
  words: number,
  children: TreeNode[] = [],
): TreeNode => ({ id, type: "doc", title, updatedAt, words, children });

const folder = (
  id: string,
  title: string,
  updatedAt: string,
  children: TreeNode[] = [],
): TreeNode => ({ id, type: "folder", title, updatedAt, words: 0, children });

export const SEED_KBS: KnowledgeBase[] = [
  {
    id: "java",
    emoji: "📗",
    name: "JAVA",
    locked: false,
    fav: true,
    scope: "mine",
    tree: [
      folder("j-base", "基础语法", "2024-05-29T20:12:00", [
        doc("j1", "正则表达式提取短信验证码", "2024-05-29T20:12:00", 1320),
        doc("j2", "集合框架笔记", "2024-04-02T11:10:00", 2150),
      ]),
      // 文章作为父节点：一篇「Tomcat 配置」下继续挂子文档。
      doc("j3", "Tomcat 配置", "2024-03-14T19:33:00", 980, [
        doc("j3a", "server.xml 详解", "2024-03-14T19:33:00", 740),
        doc("j3b", "多端口部署", "2024-03-12T09:20:00", 520),
      ]),
      doc("j4", "JDK8 环境", "2024-03-11T17:44:00", 610),
    ],
  },
  {
    id: "exam",
    emoji: "📘",
    name: "试题",
    locked: true,
    fav: false,
    scope: "mine",
    // 复刻 1.html 的目录结构。
    tree: [
      doc("e-qt", "Qt 下载教程", "2024-06-10T16:01:00", 1240),
      doc("e-cs-rec", "C#面试常见递归算法", "2024-06-02T12:02:00", 2080),
      doc("e-cs-sort", "C#经典十大排序算法", "2024-06-03T13:58:00", 3160),
      doc("e-vscode", "VScode 中配置 C/C++ 环境", "2024-06-23T00:09:00", 1450),
      // ★ 文章即父节点：这是一篇文档，同时拥有三个子文档。
      doc("e-primer", "C++ Primer 第五版中文版习题上", "2023-11-02T21:15:00", 5400, [
        doc("e-primer-1", "基础 g++ 计算题", "2024-06-03T14:03:00", 860),
        doc("e-primer-2", "命令行运行 C++", "2023-10-30T21:48:00", 540),
        doc("e-primer-3", "sqlList 顺序表", "2024-06-02T11:48:00", 1230),
      ]),
      // ★ 同样：文章作为父节点，且子节点下还能再挂孙节点（无限级）。
      doc("e-first", "第一个 C++ 程序", "2024-05-29T22:40:00", 1100, [
        doc("e-first-1", "基本类型和初始化", "2023-05-21T08:51:00", 980, [
          doc("e-first-1a", "整型与溢出", "2023-05-21T08:51:00", 420),
          doc("e-first-1b", "浮点精度", "2023-05-20T19:30:00", 360),
        ]),
        doc("e-first-2", "数组类型", "2023-05-21T08:59:00", 640),
      ]),
    ],
  },
  {
    id: "db",
    emoji: "📙",
    name: "数据库",
    locked: true,
    fav: true,
    scope: "mine",
    tree: [
      folder("db-mysql", "MySQL", "2024-11-21T13:45:00", [
        doc("d2", "安装 MySQL", "2024-11-21T13:45:00", 1530),
        doc("d-index", "索引与执行计划", "2024-11-18T10:05:00", 2240),
      ]),
      doc("d1", "ASP 入门", "2024-12-29T00:33:00", 1180),
      doc("d3", "无标题文档", "2024-11-13T02:42:00", 0),
    ],
  },
  {
    id: "math",
    emoji: "📐",
    name: "高数",
    locked: true,
    fav: false,
    scope: "mine",
    tree: [
      doc("m1", "数学公式解释", "2025-03-21T13:49:00", 2010),
      doc("m2", "2023 招生大纲", "2025-01-14T13:50:00", 1320),
      doc("m3", "积分", "2024-09-22T22:28:00", 870, [
        doc("m3a", "定积分应用", "2024-09-22T22:28:00", 640),
      ]),
    ],
  },
  {
    id: "gh",
    emoji: "🐙",
    name: "GitHub 收集",
    locked: true,
    fav: false,
    scope: "mine",
    tree: [
      doc("g1", "部署 NAS", "2025-05-28T10:55:00", 1640),
      doc("g2", "编译 Zed", "2025-05-28T10:52:00", 1280),
      doc("g3", "配置虚拟机", "2025-05-27T16:52:00", 960),
    ],
  },
  {
    id: "read",
    emoji: "📚",
    name: "阅读资料",
    locked: true,
    fav: false,
    scope: "mine",
    tree: [
      doc("r1", "应用安装记录", "2025-06-06T20:12:00", 540),
      doc("r2", "无标题文档", "2025-04-27T22:01:00", 0),
      doc("r3", "AI 日志", "2025-04-27T19:33:00", 2230),
    ],
  },
  {
    id: "android",
    emoji: "🤖",
    name: "Android",
    locked: true,
    fav: false,
    scope: "mine",
    tree: [
      doc("a1", "Jetpack Compose", "2025-02-10T09:00:00", 1870),
      doc("a2", "Gradle 缓存", "2025-01-30T11:20:00", 760),
    ],
  },
  {
    id: "deploy",
    emoji: "🚀",
    name: "部署 Shell",
    locked: false,
    fav: false,
    scope: "shared",
    tree: [
      doc("s1", "一键部署脚本", "2025-05-12T08:30:00", 1120),
      doc("s2", "Nginx 反代", "2025-04-18T15:10:00", 980),
    ],
  },
  {
    id: "infra",
    emoji: "🧩",
    name: "团队基建",
    locked: false,
    fav: false,
    scope: "shared",
    tree: [
      doc("i1", "CI 流水线说明", "2025-06-01T12:00:00", 1640),
      doc("i2", "环境变量约定", "2025-05-20T18:40:00", 720),
    ],
  },
];

// 新建知识库时循环取用的图标，保持单色/克制风格。
export const EMOJI_POOL = ["📕", "📗", "📘", "📙", "📓", "📔", "📒", "🗂️", "📦", "🧩", "💡", "🔧"];
