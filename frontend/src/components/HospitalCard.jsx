import { Link } from 'react-router-dom'

const HospitalCard = ({ hospital }) => {
  return (
    <div className="bg-[var(--bg-card)] rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4 overflow-hidden">
          {hospital.logo ? (
            <img 
              src={hospital.logo} 
              alt={hospital.name} 
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-xl font-bold text-blue-600">H</span>
          )}
        </div>
        
        <h3 className="text-xl font-bold text-gray-800 mb-3">{hospital.name}</h3>
        
        <div className="flex items-center text-gray-500 text-sm mb-4">
          <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{hospital.location}</span>
        </div>
        
        <Link
          to={`/hospitals/${hospital.id}`}
          className="w-full bg-teal text-white py-2 px-4 rounded-lg font-semibold hover:bg-teal-dark transition-colors text-center"
        >
          Book
        </Link>
      </div>
    </div>
  )
}

export default HospitalCard
