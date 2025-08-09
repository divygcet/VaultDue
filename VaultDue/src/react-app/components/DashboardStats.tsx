import { FileText, Shield, AlertTriangle, Clock } from 'lucide-react';

interface DashboardStatsProps {
  totalDocuments: number;
  criticalDocuments: number;
  expiringSoon: number;
  expired: number;
}

export default function DashboardStats({
  totalDocuments,
  criticalDocuments,
  expiringSoon,
  expired
}: DashboardStatsProps) {
  const stats = [
    {
      name: 'Total Documents',
      value: totalDocuments,
      icon: FileText,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
    },
    {
      name: 'Critical Documents',
      value: criticalDocuments,
      icon: Shield,
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100',
    },
    {
      name: 'Expiring Soon',
      value: expiringSoon,
      icon: Clock,
      gradient: 'from-yellow-500 to-orange-500',
      bgGradient: 'from-yellow-50 to-orange-100',
    },
    {
      name: 'Expired',
      value: expired,
      icon: AlertTriangle,
      gradient: 'from-red-500 to-red-600',
      bgGradient: 'from-red-50 to-red-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.name}
            className={`bg-gradient-to-br ${stat.bgGradient} backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-200`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
