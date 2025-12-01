export const conveyorBelts = [
  {
    id: 1,
    name: "نوار مواد اولیه",
    status: "running",
    speed: 2.5,
    speedUnit: "متر/ثانیه",
    load: 85,
    loadUnit: "%",
    temperature: 45,
    temperatureUnit: "°C",
    anomalies: 2,
    lastMaintenance: "۱۴۰۲/۱۰/۲۰",
    nextMaintenance: "۱۴۰۲/۱۱/۲۰",
    cameraId: "CAM-01",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    alarms: [
      { id: 1, type: "warning", message: "دمای یاتاقان در حال افزایش", time: "۱۴:۳۰" },
      { id: 2, type: "info", message: "نگهداری پیشگیرانه در ۷۲ ساعت آینده", time: "۱۲:۱۵" }
    ]
  },
  {
    id: 2,
    name: "خط پردازش",
    status: "warning",
    speed: 1.8,
    speedUnit: "متر/ثانیه",
    load: 95,
    loadUnit: "%",
    temperature: 68,
    temperatureUnit: "°C",
    anomalies: 5,
    lastMaintenance: "۱۴۰۲/۱۰/۱۵",
    nextMaintenance: "۱۴۰۲/۱۱/۱۵",
    cameraId: "CAM-02",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    alarms: [
      { id: 1, type: "critical", message: "اضافه بار شناسایی شد", time: "۱۴:۴۵" },
      { id: 2, type: "warning", message: "هشدار دمای بالا", time: "۱۴:۲۰" }
    ]
  },
  {
    id: 3,
    name: "نوار خنک‌کننده",
    status: "running",
    speed: 3.2,
    speedUnit: "متر/ثانیه",
    load: 70,
    loadUnit: "%",
    temperature: 32,
    temperatureUnit: "°C",
    anomalies: 0,
    lastMaintenance: "۱۴۰۲/۱۰/۲۵",
    nextMaintenance: "۱۴۰۲/۱۱/۲۵",
    cameraId: "CAM-03",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    alarms: []
  },
  {
    id: 4,
    name: "نوار بسته‌بندی",
    status: "alarm",
    speed: 0.0,
    speedUnit: "متر/ثانیه",
    load: 0,
    loadUnit: "%",
    temperature: 28,
    temperatureUnit: "°C",
    anomalies: 3,
    lastMaintenance: "۱۴۰۲/۱۰/۱۸",
    nextMaintenance: "۱۴۰۲/۱۱/۱۸",
    cameraId: "CAM-04",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    alarms: [
      { id: 1, type: "critical", message: "موتور متوقف شده است", time: "۱۴:۵۰" },
      { id: 2, type: "critical", message: "حسگر سرعت خراب است", time: "۱۴:۴۸" }
    ]
  },
  {
    id: 5,
    name: "نوار ذخیره‌سازی",
    status: "running",
    speed: 1.5,
    speedUnit: "متر/ثانیه",
    load: 60,
    loadUnit: "%",
    temperature: 38,
    temperatureUnit: "°C",
    anomalies: 1,
    lastMaintenance: "۱۴۰۲/۱۰/۲۲",
    nextMaintenance: "۱۴۰۲/۱۱/۲۲",
    cameraId: "CAM-05",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    alarms: [
      { id: 1, type: "warning", message: "لرزش غیرعادی شناسایی شد", time: "۱۳:۴۵" }
    ]
  },
  {
    id: 6,
    name: "نوار بارگیری",
    status: "stopped",
    speed: 0.0,
    speedUnit: "متر/ثانیه",
    load: 0,
    loadUnit: "%",
    temperature: 25,
    temperatureUnit: "°C",
    anomalies: 0,
    lastMaintenance: "۱۴۰۲/۱۰/۲۸",
    nextMaintenance: "۱۴۰۲/۱۱/۲۸",
    cameraId: "CAM-06",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    alarms: [
      { id: 1, type: "info", message: "توقف برنامه‌ریزی شده", time: "۱۴:۰۰" }
    ]
  }
];

export const systemMetrics = {
  totalThroughput: 1250,
  throughputUnit: "تن در ساعت",
  energyConsumption: 450,
  energyUnit: "کیلووات",
  availability: 98.5,
  availabilityUnit: "%",
  totalAnomalies: 12,
  activeAlarms: 3,
  productionToday: 8500,
  productionUnit: "تن",
  efficiency: 92.3,
  efficiencyUnit: "%"
};

export const alarmHistory = [
  {
    id: 1,
    beltId: 4,
    type: "critical",
    message: "حفاظت اضافه بار موتور فعال شد",
    time: "۱۴۰۲/۱۰/۲۵ ۱۴:۴۵:۲۳",
    acknowledged: false,
    severity: 10
  },
  {
    id: 2,
    beltId: 1,
    type: "warning",
    message: "انحراف سرعت شناسایی شد",
    time: "۱۴۰۲/۱۰/۲۵ ۱۴:۳۰:۱۵",
    acknowledged: true,
    severity: 5
  },
  {
    id: 3,
    beltId: 3,
    type: "warning",
    message: "دمای یاتاقان بالاتر از حد مجاز",
    time: "۱۴۰۲/۱۰/۲۵ ۱۳:۱۵:۴۲",
    acknowledged: true,
    severity: 6
  },
  {
    id: 4,
    beltId: 2,
    type: "warning",
    message: "لرزش بیش از حد مجاز",
    time: "۱۴۰۲/۱۰/۲۵ ۱۲:۴۵:۱۸",
    acknowledged: false,
    severity: 7
  },
  {
    id: 5,
    beltId: 5,
    type: "info",
    message: "نگهداری پیشگیرانه مورد نیاز",
    time: "۱۴۰۲/۱۰/۲۵ ۱۱:۲۰:۳۵",
    acknowledged: true,
    severity: 3
  },
];

export const maintenanceSchedule = [
  { id: 1, beltId: 2, type: "پیشگیرانه", date: "۱۴۰۲/۱۱/۰۱", duration: "۴ ساعت", assignedTo: "تیم فنی A" },
  { id: 2, beltId: 4, type: "اضطراری", date: "۱۴۰۲/۱۰/۲۶", duration: "۸ ساعت", assignedTo: "تیم فنی B" },
  { id: 3, beltId: 1, type: "پیشگیرانه", date: "۱۴۰۲/۱۱/۲۰", duration: "۳ ساعت", assignedTo: "تیم فنی A" },
  { id: 4, beltId: 3, type: "پیشگیرانه", date: "۱۴۰۲/۱۱/۲۵", duration: "۲ ساعت", assignedTo: "تیم فنی C" },
  { id: 5, beltId: 5, type: "پیشگیرانه", date: "۱۴۰۲/۱۱/۲۲", duration: "۳ ساعت", assignedTo: "تیم فنی B" },
  { id: 6, beltId: 6, type: "پیشگیرانه", date: "۱۴۰۲/۱۱/۲۸", duration: "۴ ساعت", assignedTo: "تیم فنی A" },
];

export const operators = [
  { id: 1, name: "احمد رضایی", role: "اپراتور ارشد", shift: "صبح", status: "آنلاین" },
  { id: 2, name: "محمد حسینی", role: "اپراتور", shift: "عصر", status: "آنلاین" },
  { id: 3, name: "علی محمدی", role: "اپراتور", shift: "شب", status: "آفلاین" },
  { id: 4, name: "رضا کریمی", role: "سرپرست", shift: "صبح", status: "آنلاین" },
  { id: 5, name: "مجید نوروزی", role: "تکنسیک", shift: "صبح", status: "مشغول" },
];