/* ============================================================
   HOTEL ∞ INFINITO — Demo jugable del turno de noche
   Datos de pisos, tareas y eventos del demo web.
   El juego real vive en Roblox Studio; esta demo demuestra el loop.
   ============================================================ */

export type DemoTask = { room: string; label: string };

export type FloorConfig = {
  code: string;
  name: string;
  subtitle: string;
  accent: string;
  accentSoft: string;
  ruleTitle: string;
  ruleDesc: string;
  objective: string;
  /** Segundos de turno. En pisos con cuota, el turno termina al cumplir la cuota. */
  time: number;
  quota: number; // 0 = sin cuota (sobrevivir)
  hearts: number;
  hazard: "agua" | "espejos" | "caldera";
  intro: string;
};

export const FLOORS: FloorConfig[] = [
  {
    code: "P-13",
    name: "LA PISCINA SIN FIN",
    subtitle: "Piso 13 · área húmeda",
    accent: "#38e1d4",
    accentSoft: "rgba(56,225,212,0.12)",
    ruleTitle: "REGLA DEL PISO: NO TE MOJES",
    ruleDesc:
      "Los charcos se mueven después de cada tarea. Pisar agua resbala: pierdes un corazón y las toallas vuelan.",
    objective: "Completa 5 tareas antes de que acabe el turno",
    time: 90,
    quota: 5,
    hearts: 3,
    hazard: "agua",
    intro:
      "Un piso entero inundado. Los pasillos huelen a cloro viejo y algo nada en círculos. Si salpicas, lo oyes acercarse.",
  },
  {
    code: "P-∞",
    name: "EL PISO ESPEJO",
    subtitle: "Piso infinito · área reflejada",
    accent: "#ffa02f",
    accentSoft: "rgba(255,160,47,0.12)",
    ruleTitle: "REGLA DEL PISO: TODO ESTÁ INVERTIDO",
    ruleDesc:
      "Los controles van al revés y tus reflejos te imitan con tres segundos de retraso. Si te alcanzan, ocupan tu turno.",
    objective: "Completa 5 tareas antes de que acabe el turno",
    time: 90,
    quota: 5,
    hearts: 3,
    hazard: "espejos",
    intro:
      "Todo está al revés: los pasillos, los números de las puertas y los huéspedes, que copian cada paso que das. No dejes de moverte.",
  },
  {
    code: "P--1",
    name: "LA CALDERA",
    subtitle: "Subsótano · corazón del hotel",
    accent: "#ff6a3d",
    accentSoft: "rgba(255,106,61,0.12)",
    ruleTitle: "REGLA DEL PISO: LA CALDERA NO SE APAGA",
    ruleDesc:
      "Tres calderas pierden presión sin motivo aparente. Aliméntalas desde el frente. Si una llega a cero… ya sabes lo que pasa.",
    objective: "Aguanta el turno completo con las 3 calderas vivas",
    time: 75,
    quota: 0,
    hearts: 3,
    hazard: "caldera",
    intro:
      "El corazón del hotel, bajo el sótano. El evento final: mantener el calor mientras el hotel entero intenta apagarte.",
  },
];

export const TASK_POOL: DemoTask[] = [
  { room: "404", label: "Limpiar la habitación 404 (no existe)" },
  { room: "13", label: "Llevar toallas a la habitación 13" },
  { room: "000", label: "Registrar al huésped sin cara" },
  { room: "07", label: "Recoger los sueños derramados de la 7" },
  { room: "3:33", label: "Servir el desayuno de las 3:33 AM" },
  { room: "∞", label: "Contar los cuadros del pasillo (siempre dan 14)" },
  { room: "88", label: "Devolver la maleta que grita a la 88" },
  { room: "5B", label: "Poner cartel DND en la puerta espejada 5B" },
  { room: "21", label: "Regar las plantas carnívoras del lobby" },
  { room: "12", label: "Aspirar las escaleras que suben solas" },
];

export const FLAVOR_EVENTS: string[] = [
  "El ascensor se abrió solo. No lo mencionemos.",
  "Un huésped pidió «hielo, pero de abajo».",
  "La piscina susurró tu nombre. Probablemente nada.",
  "Los cuadros voltearon a mirarte. Siguen siendo 14.",
  "El teléfono sonó en la habitación vacía. Colgaste a tiempo.",
  "Se perdió el gato del piso 5. Lleva perdido desde 1987.",
  "Los tubos volvieron a cantar en Do menor.",
  "Alguien dejó una propina masticada. La guardaste por educación.",
];

export const FIRED_REASONS: Record<string, string> = {
  agua: "Corriste por el borde de la piscina. El agua también cuenta como supervisora.",
  espejos: "Tu reflejo ocupó tu turno. El sindicato de reflejos dio el visto bueno.",
  caldera: "La caldera se durmió. Tú también vas a dormir… en recepción.",
  tiempo: "Se acabó el turno sin completar la cuota. El hotel no acepta excusas mojadas.",
};

export const TIP_MIN = 8;
export const TIP_MAX = 18;

export function randomTip(): number {
  return TIP_MIN + Math.floor(Math.random() * (TIP_MAX - TIP_MIN + 1));
}

export function rankForTips(tips: number): { title: string; note: string } {
  if (tips < 110)
    return {
      title: "BECARIO DEL VACÍO",
      note: "Sobreviviste… técnicamente. El hotel te espera mañana. Y pasado. Y siempre.",
    };
  if (tips < 170)
    return {
      title: "EMPLEADO NOCTURNO CONFIABLE",
      note: "Los huéspedes sin cara dejaron buena reseña. No tienen cara, pero la reseña era de cinco estrellas.",
    };
  return {
    title: "GERENTE ETERNO ∞",
    note: "Contrato permanente firmado en tinta invisible. El hotel ahora es tu hotel. Bienvenido, Gerente.",
  };
}
