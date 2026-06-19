// 展示用日期格式化：当年只显示「MM-DD HH:mm」，跨年补上年份。
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  const mmdd = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    ? `${mmdd} ${hm}`
    : `${d.getFullYear()}-${mmdd}`;
}

// 取知识库内最新一篇文档的时间，用于「最近」视图排序。
export function latestTime(times: string[]): number {
  return times.reduce((max, t) => Math.max(max, new Date(t).getTime() || 0), 0);
}
