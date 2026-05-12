import '@visionflow/ui/styles/fonts.css';
import '@visionflow/ui/styles/tokens.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import 'antd/dist/reset.css';
import './globals.css';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import { QueryProvider } from '@/components/query-provider';
const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
});
const pretendard = localFont({
    src: '../../../packages/ui/fonts/PretendardVariable.woff2',
    display: 'swap',
    weight: '45 920',
    style: 'normal',
    variable: '--font-pretendard',
});
export const metadata = {
    description: 'VisionFlow realtime computer vision operations dashboard',
    title: 'VisionFlow',
};
export default function RootLayout({ children }) {
    return (<html className={`${inter.variable} ${pretendard.variable}`} lang="ko">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>);
}
