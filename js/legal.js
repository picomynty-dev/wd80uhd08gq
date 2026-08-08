'use strict';

export const LEGAL_CONFIG = Object.freeze({
  controllerName: '',
  contactEmail: '',
  effectiveDate: '2026-08-08',
  jurisdiction: 'España / Unión Europea'
});

export function legalLaunchStatus() {
  const blockers = [];
  if (!LEGAL_CONFIG.controllerName.trim()) blockers.push('responsable del tratamiento');
  if (!LEGAL_CONFIG.contactEmail.trim()) blockers.push('correo de privacidad/contacto');
  return {
    ready: blockers.length === 0,
    blockers,
    label: blockers.length ? `${blockers.length} pendiente${blockers.length === 1 ? '' : 's'}` : 'Completo'
  };
}

export function privacySections() {
  return [
    {
      title: 'Estado del documento',
      body: 'Borrador técnico para la beta. Antes de abrir una beta pública hay que completar la identidad del responsable y un canal de contacto real.'
    },
    {
      title: 'Datos que usa My Fit Plan',
      body: 'Cuenta (correo y nombre de perfil), rutinas, entrenamientos, historial, objetivos, peso y medidas, revisiones corporales y fotografías que el usuario decida guardar. Para Premium se conserva el estado de suscripción y los identificadores técnicos necesarios para vincular la cuenta con Paddle. My Fit Plan no almacena los datos de tarjeta.'
    },
    {
      title: 'Para qué se usan',
      body: 'Crear y mantener la cuenta, sincronizar el progreso entre dispositivos, prestar las funciones de entrenamiento, conservar fotografías privadas, gestionar el acceso Premium, resolver incidencias y recibir feedback de la beta cuando el usuario lo envía voluntariamente.'
    },
    {
      title: 'Dónde se guardan',
      body: 'La aplicación es local-first: conserva una copia en el dispositivo. Si hay una cuenta iniciada, también sincroniza datos con My Fit Plan Cloud y las fotografías con almacenamiento privado. La facturación Premium se procesa mediante Paddle.'
    },
    {
      title: 'Conservación y borrado',
      body: 'Los datos de la aplicación se conservan mientras exista la cuenta o hasta que el usuario los elimine. La opción Eliminar cuenta borra los datos de My Fit Plan y solicita la cancelación inmediata de una suscripción activa antes de eliminar la cuenta. Determinados registros de facturación pueden quedar sujetos a las obligaciones legales del proveedor de pagos y no dependen de la base de datos de My Fit Plan.'
    },
    {
      title: 'Derechos',
      body: 'La aplicación permite exportar los datos, corregir información del perfil y solicitar la eliminación de la cuenta. Antes de producción debe añadirse aquí el canal real para ejercer acceso, rectificación, supresión, oposición, limitación y portabilidad cuando proceda.'
    },
    {
      title: 'Datos de salud y fotografías',
      body: 'Peso, medidas, fotografías y determinados datos de entrenamiento pueden ser especialmente sensibles. Antes de producción debe revisarse específicamente su base jurídica, minimización, conservación y medidas de seguridad con asesoramiento adecuado.'
    }
  ];
}

export function termsSections() {
  return [
    {
      title: 'Estado Beta',
      body: 'My Fit Plan está en fase beta. Puede contener errores, cambios de interfaz o funciones que todavía estén en validación.'
    },
    {
      title: 'Orientación de entrenamiento',
      body: 'La aplicación ofrece planificación y orientación general. No realiza diagnósticos médicos y no sustituye la valoración de profesionales sanitarios o del entrenamiento.'
    },
    {
      title: 'Cuenta y seguridad',
      body: 'El usuario debe mantener sus credenciales seguras y revisar que los datos de su cuenta sean correctos. La aplicación puede funcionar localmente sin cuenta, con funciones cloud limitadas.'
    },
    {
      title: 'Premium',
      body: 'Durante esta fase los cobros están en Paddle Sandbox y no representan pagos reales. Cuando se active producción, precio, renovación, cancelación y condiciones deberán mostrarse antes de confirmar una compra.'
    },
    {
      title: 'Cancelación y eliminación',
      body: 'La gestión de suscripción se realiza mediante el portal seguro de Paddle. La eliminación de cuenta intenta cancelar inmediatamente cualquier suscripción activa antes de borrar la cuenta para evitar dejar una facturación huérfana.'
    },
    {
      title: 'Contenido y copias',
      body: 'El usuario es responsable de la información que introduce. My Fit Plan permite exportar una copia de seguridad; las fotografías privadas se gestionan por separado.'
    }
  ];
}
