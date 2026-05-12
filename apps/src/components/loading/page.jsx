'use client';
import { Spin, Typography } from 'antd';
import styles from './page.module.css';
const { Text } = Typography;
export default function Loading({ className, fullscreen = false, message = '로딩 중입니다.', size = 'large', style, }) {
    return (<div className={[
            styles.loading,
            fullscreen ? styles.fullscreen : '',
            className ?? '',
        ].join(' ')} role="status" style={style}>
      <Spin size={size}/>
      {message ? <Text type="secondary">{message}</Text> : null}
    </div>);
}
