import { z } from "zod";

// Mensajes de validación por defecto en español (Paraguay). Los esquemas definen
// mensajes específicos cuando hace falta más contexto.
z.config({
  customError: (issue) => {
    switch (issue.code) {
      case "invalid_type":
        if (issue.input === undefined || issue.input === null || issue.input === "") return "Este campo es obligatorio.";
        return "El valor ingresado no es válido.";
      case "too_small":
        if (issue.origin === "string") {
          return Number(issue.minimum) <= 1 ? "Este campo es obligatorio." : `Debe tener al menos ${issue.minimum} caracteres.`;
        }
        if (issue.origin === "array") return `Selecciona al menos ${issue.minimum} opción(es).`;
        return `El valor debe ser mayor o igual a ${issue.minimum}.`;
      case "too_big":
        if (issue.origin === "string") return `Debe tener como máximo ${issue.maximum} caracteres.`;
        if (issue.origin === "array") return `Puedes seleccionar como máximo ${issue.maximum} opción(es).`;
        return `El valor debe ser menor o igual a ${issue.maximum}.`;
      case "invalid_format":
        if (issue.format === "email") return "Ingresa un correo electrónico válido.";
        if (issue.format === "url") return "Ingresa un enlace válido.";
        return "El formato no es válido.";
      case "invalid_value":
        return "Selecciona una opción válida.";
      default:
        return "El valor ingresado no es válido.";
    }
  },
});

export { z };
