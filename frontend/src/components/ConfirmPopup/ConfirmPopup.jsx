import { X } from 'lucide-react'
import styles from './ConfirmPopup.module.css'

function ConfirmPopup({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm', 
  message = 'Are you sure?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'default' // 'default', 'danger', 'success'
}) {
  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          <X size={18} />
        </button>
        
        <div className={styles.content}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.message}>{message}</p>
        </div>
        
        <div className={styles.actions}>
          {onConfirm && (
            <button 
              className={styles.cancelButton} 
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}
          <button 
            className={`${styles.confirmButton} ${styles[type]}`}
            onClick={() => {
              onConfirm?.()
              onClose()
            }}
          >
            {onConfirm ? confirmText : 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmPopup
