import styles from './ListeningActivityPanel.module.css'

function ListeningActivityPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>It's too quite...</p>
        <p className={styles.emptyText}>
          We will show you how many are listening too - And what they are listening
        </p>
      </div>
    </div>
  )
}

export default ListeningActivityPanel
