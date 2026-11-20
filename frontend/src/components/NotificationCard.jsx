const NotificationCard = ({ notification }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-orange-500'
      case 'pending':
        return 'bg-orange-500'
      case 'cancelled':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatDate = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return `${months[d.getMonth()]} ${d.getDate()}${getOrdinal(d.getDate())}, ${d.getFullYear()}`
  }

  const getOrdinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return s[(v - 20) % 10] || s[v] || s[0]
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-lg border border-gray-200 p-4 shadow-sm mb-4">
      <div className="flex items-start">
        <div className="w-16 h-16 rounded-full bg-teal flex items-center justify-center mr-4 overflow-hidden flex-shrink-0 relative">
          {notification.doctorImage && (
            <img 
              src={notification.doctorImage} 
              alt={notification.doctorName} 
              className="w-full h-full object-cover absolute inset-0"
              onError={(e) => {
                console.error('Failed to load notification doctor image:', notification.doctorImage)
                e.target.style.display = 'none'
              }}
            />
          )}
          <span className={`text-lg font-bold text-white ${notification.doctorImage ? 'opacity-0' : 'opacity-100'}`}>
            {notification.doctorName?.split(' ').map(n => n[0]).join('') || 'D'}
          </span>
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              {/* Fix Dark Mode Contrast: Title/Specialty uses bright white, Doctor Name uses light gray */}
              <p className="font-bold text-gray-800 dark:text-[#EAF6FF]">{notification.specialty}</p>
              <p className="text-gray-600 dark:text-[#C7D2FE]">{notification.doctorName}</p>
            </div>
            
            <div className="text-right">
              {notification.status === 'confirmed' && (
                <div className="flex items-center text-green-600 text-sm mb-1">
                  <span className="mr-1">✓</span>
                  <span>{notification.message}</span>
                </div>
              )}
              {(notification.status === 'pending' || notification.status === 'cancelled') && (
                <div className={`flex items-center text-sm mb-1 ${notification.status === 'cancelled' ? 'text-red-600' : 'text-gray-600'}`}>
                  <span className="mr-1">{notification.status === 'cancelled' ? '✕' : '🕐'}</span>
                  <span>{notification.message}</span>
                </div>
              )}
            </div>
          </div>
          
          <button
            className={`${getStatusColor(notification.status)} text-white px-4 py-1 rounded text-sm font-semibold`}>
            {notification.status?.charAt(0).toUpperCase() + notification.status?.slice(1) || 'Pending'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotificationCard
