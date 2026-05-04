<?php
/**
 * Plugin Name: JPRE Taller Shortcode
 * Description: Shortcode para mostrar una ficha informativa de taller desde Google Sheets/Web App.
 * Version: 1.0.0
 * Author: JPRE
 */

if (!defined('ABSPATH')) {
    exit;
}

define('JPRE_TALLER_WEBAPP_URL', 'https://script.google.com/macros/s/AKfycbwnlk1OhghSo_PCC5xXZnqKqc7TVUZFJrexK-PxSCxp0ODWSA0ebfV0XKThSxDFFi7h/exec');

function jpre_taller_enqueue_assets() {
    wp_register_style(
        'jpre-taller-style',
        plugins_url('assets/jpre-taller-page.css', __FILE__),
        array(),
        '1.0.0'
    );

    wp_register_script(
        'jpre-taller-script',
        plugins_url('assets/jpre-taller-page.js', __FILE__),
        array(),
        '1.0.0',
        true
    );
}
add_action('wp_enqueue_scripts', 'jpre_taller_enqueue_assets');

function jpre_taller_shortcode($atts = array()) {
    static $instance = 0;
    $instance++;

    $atts = shortcode_atts(
        array(
            'num' => '',
            'nom' => '',
            'franja' => '',
            'id' => '',
            'webapp_url' => JPRE_TALLER_WEBAPP_URL,
        ),
        $atts,
        'jpre_taller'
    );

    wp_enqueue_style('jpre-taller-style');
    wp_enqueue_script('jpre-taller-script');

    $instance_id = 'jpre-taller-page-' . $instance;
    ob_start();
    ?>
    <section
      id="<?php echo esc_attr($instance_id); ?>"
      class="jpre-taller-page"
      data-webapp-url="<?php echo esc_attr($atts['webapp_url']); ?>"
      data-num="<?php echo esc_attr($atts['num']); ?>"
      data-taller-id="<?php echo esc_attr($atts['id']); ?>"
      data-taller-nom="<?php echo esc_attr($atts['nom']); ?>"
      data-franja="<?php echo esc_attr($atts['franja']); ?>"
    >
      <div class="jpre-shell">
        <article class="jpre-hero">
          <p class="jpre-kicker">Fitxa de Taller</p>
          <h1 class="jpre-title">Carregant...</h1>
          <div class="jpre-meta">
            <span class="jpre-chip jpre-chip-franja">Franja: -</span>
            <span class="jpre-chip jpre-chip-etapa">Etapa: -</span>
            <span class="jpre-chip jpre-chip-aula">Aula: -</span>
          </div>
          <p class="jpre-loading">Carregant informació del taller...</p>
          <p class="jpre-error is-hidden">No s'ha trobat el taller.</p>
        </article>

        <section class="jpre-main is-hidden">
          <div class="jpre-box">
            <h3>Descripció del taller</h3>
            <p class="jpre-text jpre-descripcio"></p>
          </div>

          <div class="jpre-box">
            <h3>Places disponibles</h3>
            <p class="jpre-text jpre-places"></p>
            <div class="jpre-progress">
              <div class="jpre-progress-track">
                <div class="jpre-progress-bar"></div>
              </div>
              <div class="jpre-progress-label">0%</div>
            </div>
          </div>

          <div class="jpre-box">
            <h3>Imparteix</h3>
            <p class="jpre-text jpre-imparteix"></p>
            <div class="jpre-photos">
              <img class="jpre-photo jpre-foto-1 is-hidden" alt="Foto ponent 1" />
              <img class="jpre-photo jpre-foto-2 is-hidden" alt="Foto ponent 2" />
            </div>
          </div>

          <div class="jpre-box">
            <h3>Dispositiu / tecnologia</h3>
            <div class="jpre-device-wrap">
              <p class="jpre-text jpre-dispositiu"></p>
              <img class="jpre-device-img is-hidden" alt="Dispositiu" />
            </div>
          </div>

          <div class="jpre-box">
            <h3>Material necessari</h3>
            <p class="jpre-text jpre-material"></p>
          </div>

          <div class="jpre-box jpre-video-wrap is-hidden">
            <h3>Vídeo del taller</h3>
            <div class="jpre-video-container">
              <iframe class="jpre-video-iframe" frameborder="0" allowfullscreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
              </iframe>
            </div>
          </div>
        </section>
      </div>
    </section>
    <?php
    return ob_get_clean();
}
add_shortcode('jpre_taller', 'jpre_taller_shortcode');
