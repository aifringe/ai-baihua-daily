import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '刘海儿的 AI 雷达 · 看懂变化，找到行动', description: '值得关注的 AI 情报、人物对话、工具、行业报告与行动建议，用普通人听得懂的话讲清楚。' };
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="zh-CN"><body>{children}</body></html>}
