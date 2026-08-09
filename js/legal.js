'use strict';

export const LEGAL_CONFIG = Object.freeze({
  controllerName: 'Raúl Vera',
  contactEmail: 'pacopacoe826@gmail.com',
  contactPostalAddress: '',
  effectiveDate: '2026-08-09',
  jurisdiction: 'España / Unión Europea'
});

export function legalLaunchStatus() {
  const blockers = [];
  if (!LEGAL_CONFIG.controllerName.trim()) blockers.push('responsable del tratamiento');
  if (!LEGAL_CONFIG.contactEmail.trim()) blockers.push('correo de privacidad/contacto');
  if (!LEGAL_CONFIG.contactPostalAddress.trim()) blockers.push('dirección postal de contacto');
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
      body: 'Aviso de privacidad preparado para la candidata a beta externa. La distribución externa permanece bloqueada mientras falte la dirección postal de contacto del responsable.'
    },
    {
      title: 'Responsable y contacto',
      body: `Responsable del tratamiento: ${LEGAL_CONFIG.controllerName || 'pendiente'}. Contacto de privacidad y ejercicio de derechos: ${LEGAL_CONFIG.contactEmail || 'pendiente'}. Dirección postal de contacto: ${LEGAL_CONFIG.contactPostalAddress || 'pendiente de completar antes de la beta externa'}.`
    },
    {
      title: 'Datos que usa My Fit Plan',
      body: 'Cuenta (correo y nombre de perfil), configuración de entrenamiento, rutinas, sesiones, historial, objetivos, peso, estatura, medidas, revisiones corporales, fotografías de progreso que el usuario decida guardar, datos técnicos mínimos de sincronización y, si se usa Premium, estado e identificadores técnicos de suscripción. My Fit Plan no almacena los datos completos de tarjeta.'
    },
    {
      title: 'Finalidades y bases',
      body: 'Los datos se usan para crear y mantener la cuenta, guardar y sincronizar el progreso, prestar las funciones solicitadas, permitir copias y recuperación, gestionar el acceso Premium, seguridad, soporte y feedback voluntario de la beta. Cuando los datos de progreso físico puedan revelar información relativa a la salud, su tratamiento se apoya en el consentimiento explícito del usuario, que puede retirar sin afectar al tratamiento realizado con anterioridad.'
    },
    {
      title: 'Datos de progreso físico y fotografías',
      body: 'Peso, medidas, fotografías y otros datos de progreso se introducen voluntariamente. La primera configuración solicita de forma separada el consentimiento para tratar estos datos con fines de seguimiento dentro de My Fit Plan. El usuario puede evitar añadir fotografías o medidas que no quiera conservar.'
    },
    {
      title: 'Dónde se guardan y proveedores',
      body: 'La aplicación es local-first y conserva una copia en el dispositivo. Con una cuenta iniciada, los datos se sincronizan con My Fit Plan Cloud y las fotografías con almacenamiento privado asociado a la cuenta. Supabase presta la infraestructura cloud utilizada por la beta y Paddle gestiona la infraestructura de facturación Premium. La beta mantiene Paddle en Sandbox y no realiza cobros reales.'
    },
    {
      title: 'Conservación y borrado',
      body: 'Los datos de My Fit Plan se conservan mientras exista la cuenta o hasta que el usuario los elimine, salvo información que deba mantenerse por una obligación legal aplicable. La aplicación permite borrar datos locales, exportar una copia y eliminar la cuenta Cloud. Los registros que conserve un proveedor por sus propias obligaciones legales se rigen por dichas obligaciones.'
    },
    {
      title: 'Derechos',
      body: `Puedes solicitar acceso, rectificación, supresión, oposición, limitación y portabilidad cuando proceda, así como retirar un consentimiento, escribiendo a ${LEGAL_CONFIG.contactEmail || 'el correo de privacidad pendiente'}. También puedes presentar una reclamación ante la Agencia Española de Protección de Datos si consideras que el tratamiento no se ajusta a la normativa.`
    },
    {
      title: 'Decisiones y orientación',
      body: 'My Fit Plan usa reglas de entrenamiento para ordenar recomendaciones y progresiones, pero no realiza diagnósticos médicos ni adopta decisiones con efectos jurídicos sobre el usuario. La planificación ofrecida es orientación general de entrenamiento.'
    }
  ];
}

export function termsSections() {
  return [
    {
      title: 'Estado Beta',
      body: 'My Fit Plan está en fase beta y puede contener errores, cambios de interfaz, interrupciones o funciones todavía en validación. El feedback de los testers se utiliza para mejorar la aplicación.'
    },
    {
      title: 'Edad mínima de esta beta',
      body: 'Esta beta está diseñada únicamente para personas mayores de 18 años. La configuración inicial exige confirmar la mayoría de edad.'
    },
    {
      title: 'Orientación de entrenamiento',
      body: 'La aplicación ofrece planificación y orientación general. No realiza diagnósticos médicos y no sustituye la valoración de profesionales sanitarios o del entrenamiento. Ante dolor, lesión, enfermedad o una condición que pueda afectar al ejercicio, corresponde solicitar asesoramiento profesional adecuado.'
    },
    {
      title: 'Cuenta y seguridad',
      body: 'El usuario debe mantener sus credenciales seguras y revisar que los datos de su cuenta sean correctos. My Fit Plan puede funcionar localmente sin cuenta, con funciones cloud limitadas.'
    },
    {
      title: 'Premium',
      body: 'Durante esta fase los cobros están en Paddle Sandbox y no representan pagos reales. Una futura activación en producción deberá mostrar precio, renovación, cancelación y condiciones aplicables antes de confirmar una compra.'
    },
    {
      title: 'Cancelación y eliminación',
      body: 'La gestión de suscripción se realiza mediante la infraestructura segura de Paddle. La eliminación de cuenta intenta cancelar cualquier suscripción activa antes de borrar la cuenta para evitar dejar una facturación huérfana.'
    },
    {
      title: 'Contenido y copias',
      body: 'El usuario es responsable de la información que introduce. My Fit Plan permite exportar una copia de seguridad; las fotografías privadas se gestionan por separado y solo se guardan cuando el usuario decide añadirlas.'
    }
  ];
}
