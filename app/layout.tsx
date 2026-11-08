import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '海选AI · 少一点噪声，多一点收获', description: '刘海的 AI 精选站。每天3—5条重要情报，发现国内一人公司案例、免费资源与实用工具。' };
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="zh-CN"><body>{children}</body></html>}
