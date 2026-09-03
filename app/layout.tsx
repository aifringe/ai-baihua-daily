import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'AI 白话日报 · 看懂变化，不追噪音', description: '值得关注的 AI 新闻，用普通人听得懂的话讲清楚。附原文、白话解读与本地 AI 问答。' };
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="zh-CN"><body>{children}</body></html>}
