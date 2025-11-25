/*!
=========================================================
* Conveyor Monitoring Dashboard Sidebar (Custom)
=========================================================
*/

import Dashboard from "views/Dashboard.js";
import ConveyorBelt from "views/ConveyorBelt.js";
import Cameras from "views/Cameras.js";
import Radars from "views/Radars.js";
import Ultrasonic from "views/Ultrasonic.js";
import Settings from "views/Settings.js";

const dashboardRoutes = [
  {
    path: "/dashboard",
    name: "داشبورد",
    icon: "nc-icon nc-chart-pie-35",
    component: Dashboard,
    layout: "/admin",
  },
  {
    path: "/conveyor-belt",
    name: "نوار نقاله",
    icon: "nc-icon nc-settings-gear-65",
    component: ConveyorBelt,
    layout: "/admin",
  },
  {
    path: "/cameras",
    name: "دوربین‌ها",
    icon: "nc-icon nc-camera-compact",
    component: Cameras,
    layout: "/admin",
  },
  {
    path: "/radars",
    name: "رادارها",
    icon: "nc-icon nc-atom",
    component: Radars,
    layout: "/admin",
  },
  {
    path: "/ultrasonic",
    name: "سنسورهای آلتراسونیک",
    icon: "nc-icon nc-sound-wave",
    component: Ultrasonic,
    layout: "/admin",
  },
  {
    path: "/settings",
    name: "تنظیمات",
    icon: "nc-icon nc-settings",
    component: Settings,
    layout: "/admin",
  },
];

export default dashboardRoutes;
