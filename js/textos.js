// textos.js — todo el contenido educativo, en sus dos niveles.
// SIMPLE: lenguaje natural, sin jerga.
// PRO: nombra stops, EV, difracción, regla recíproca.

const EXPLICACIONES = {
  'muy-subexpuesta': {
    simple: 'La foto sale casi negra: entra muy poca luz. Abre más el diafragma (número f más bajo), usa una velocidad más lenta o sube el ISO.',
    pro:    'Subexposición de más de 2 stops. Compensa abriendo el diafragma, alargando el tiempo o subiendo el ISO — cualquiera de los tres, o repartido entre ellos.'
  },
  'subexpuesta': {
    simple: 'La foto sale oscura. Te falta un poco de luz: prueba abrir el diafragma o bajar la velocidad.',
    pro:    'Subexposición de entre medio y 2 stops. Recuperable en revelado si disparas en RAW, pero pagarás con ruido en las sombras.'
  },
  'correcta': {
    simple: 'Bien. Los tres ajustes están equilibrados para esta luz y la foto sale como debe.',
    pro:    'Exposición dentro de ±0,5 stops del valor de la escena. Desde aquí puedes reorganizar los tres parámetros sin cambiar el brillo — mira las equivalencias.'
  },
  'sobreexpuesta': {
    simple: 'La foto sale demasiado clara. Entra más luz de la necesaria: cierra el diafragma, sube la velocidad o baja el ISO.',
    pro:    'Sobreexposición de entre medio y 2 stops. Las altas luces empiezan a recortarse y esa información no se recupera en revelado.'
  },
  'muy-sobreexpuesta': {
    simple: 'La foto sale quemada, casi blanca. Entra muchísima luz de más.',
    pro:    'Sobreexposición de más de 2 stops. Altas luces completamente recortadas: el detalle en esas zonas está perdido de forma irreversible.'
  }
};

const AVISOS = {
  'trepidacion': {
    simple: 'A esta velocidad la foto puede salir movida por el pulso. Apoya la cámara.',
    pro:    'Por debajo de la regla recíproca (1/focal): riesgo de trepidación. Usa trípode o estabilización.'
  },
  'difraccion': {
    simple: 'Con el diafragma tan cerrado la foto pierde un poco de nitidez.',
    pro:    'Difracción: más allá de f/16 la nitidez global cae aunque la profundidad de campo aumente.'
  },
  'ruido-alto': {
    simple: 'Con este ISO va a aparecer bastante grano en las zonas oscuras.',
    pro:    'ISO alto: ruido de luminancia y croma notorio, y pérdida de rango dinámico.'
  }
};

export function explicacion(veredicto, modo) {
  return EXPLICACIONES[veredicto][modo === 'pro' ? 'pro' : 'simple'];
}

export function textoAviso(clave, modo) {
  return AVISOS[clave][modo === 'pro' ? 'pro' : 'simple'];
}

export const GLOSARIO = [
  {
    termino: 'Apertura',
    simple: 'El tamaño del agujero por donde entra la luz. Número bajo (f/2) = entra mucha luz y el fondo sale desenfocado. Número alto (f/16) = entra poca luz y sale casi todo nítido.',
    pro:    'Diámetro relativo del diafragma, expresado como f = distancia focal / diámetro efectivo. Cada stop multiplica o divide el área por dos, de ahí la progresión en √2. Controla también la profundidad de campo.'
  },
  {
    termino: 'Velocidad de obturación',
    simple: 'Cuánto tiempo está abierta la cámara. Rápida congela el movimiento; lenta lo deja borroso.',
    pro:    'Tiempo de exposición del sensor. Cada stop duplica o divide a la mitad ese tiempo. Determina el arrastre del sujeto y, por la regla recíproca, el riesgo de trepidación.'
  },
  {
    termino: 'ISO',
    simple: 'Cuánta sensibilidad a la luz tiene la cámara. Subirlo aclara la foto, pero le mete grano.',
    pro:    'Ganancia aplicada a la señal del sensor. Cada stop duplica la señal y también el ruido, reduciendo el rango dinámico disponible.'
  },
  {
    termino: 'Stop',
    simple: 'Un paso. Un stop más significa el doble de luz; un stop menos, la mitad.',
    pro:    'La unidad de la exposición: un factor de 2 en la luz que llega al sensor. Los tres parámetros se miden en la misma unidad, y por eso son intercambiables entre sí.'
  },
  {
    termino: 'Triángulo de exposición',
    simple: 'La relación entre los tres ajustes. Si cambias uno, tienes que compensar con otro para que la foto siga saliendo bien.',
    pro:    'El sistema de tres variables que determinan la exposición. Como todas se miden en stops, un cambio de +n en una se compensa con −n repartidos entre las otras dos: eso son las equivalencias.'
  }
];

export const FAQ = [
  {
    pregunta: '¿Qué es el triángulo de exposición?',
    simple: 'Son los tres ajustes que deciden si tu foto sale clara, oscura o bien: la apertura, la velocidad y el ISO. Se llaman triángulo porque están conectados — si tocas uno, tienes que compensar con otro.',
    pro:    'El conjunto de apertura, tiempo de obturación e ISO, las tres variables que determinan la exposición. Todas se miden en stops, así que un cambio en una se compensa exactamente con el cambio inverso repartido entre las otras dos.'
  },
  {
    pregunta: '¿Por qué mis fotos salen oscuras?',
    simple: 'Porque no está entrando suficiente luz para la situación en la que disparas. Prueba abrir más el diafragma, usar una velocidad más lenta o subir el ISO. En interiores y de noche casi siempre hay que subir el ISO.',
    pro:    'Los ajustes están por debajo del EV de la escena. Mide la diferencia en stops y compénsala. Si ya estás a diafragma máximo y en el límite de la regla recíproca, la única variable que queda es el ISO.'
  },
  {
    pregunta: '¿Qué ISO uso de noche?',
    simple: 'En la calle de noche, normalmente entre 1600 y 6400. Va a salir con grano, y es inevitable: mejor una foto con grano que una foto movida u oscura.',
    pro:    'En vía pública iluminada (EV 3), con f/2 y 1/60 el ISO cae alrededor de 3200. Prioriza el tiempo que congela al sujeto y la apertura máxima útil de tu objetivo, y deja que el ISO absorba lo que falte.'
  },
  {
    pregunta: '¿Qué apertura uso para retratos?',
    simple: 'Entre f/1.8 y f/2.8 si quieres el fondo bien desenfocado. Ojo: con el diafragma muy abierto la zona nítida es tan estrecha que puedes dejar los ojos fuera de foco.',
    pro:    'Entre f/1.8 y f/2.8 para separar al sujeto del fondo. A 85 mm y 2 m, f/1.8 deja una profundidad de campo de pocos centímetros: enfoca al ojo más cercano. Cerrar a f/4 da margen sin perder la separación.'
  },
  {
    pregunta: '¿Qué velocidad necesito para congelar el movimiento?',
    simple: 'Para una persona quieta, 1/125 basta. Para alguien caminando, 1/250. Para deporte o carreras, 1/500 o más rápido.',
    pro:    'Depende de la velocidad angular del sujeto en el encuadre, no de su velocidad absoluta: un sujeto que cruza el cuadro exige más que uno que viene de frente. Como piso, respeta siempre la regla recíproca para el pulso.'
  }
];
