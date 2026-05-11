'use client';
import styles from './PlaceholderPage.module.css';

interface Props {
  title: string;
  icon: string;
  description: string;
}

export default function PlaceholderPage({ title, icon, description }: Props) {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>{icon}</div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.desc}>{description}</p>
        <div className={styles.wip}>🚧 Tính năng đang phát triển</div>
      </div>
    </div>
  );
}
