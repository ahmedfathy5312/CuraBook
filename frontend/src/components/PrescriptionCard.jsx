import { Link } from 'react-router-dom'

const PrescriptionCard = ({ prescription }) => {
  return (
    <Link to={`/prescription/${prescription.id}`}>
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-lg bg-blue-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img
              src="/items/prescription.jpeg"
              alt="Prescription"
              className="w-full h-full object-cover"
              loading="lazy"/>
            <span className="absolute -top-1 -left-1 text-red-500 text-lg font-bold">*</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-800 mb-1 text-sm md:text-base">Prescription</h4>
            <p className="text-gray-600 text-xs md:text-sm">{prescription.doctorName}</p>
            <p className="text-gray-500 text-xs md:text-sm">{prescription.specialty}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default PrescriptionCard
