<?php
/**
 * Snippet único: shortcode [jpre_taller] con JS embebido (CSS fuera).
 * Uso:
 *   [jpre_taller num="12"]
 * Opcional:
 *   [jpre_taller num="12" webapp_url="..."]
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('jpre_taller_single_snippet_shortcode')) {
    if (!function_exists('jpre_taller_single_snippet_proxy_data')) {
        function jpre_taller_single_snippet_proxy_data() {
            $webapp_url = isset($_GET['webapp_url']) ? esc_url_raw(wp_unslash($_GET['webapp_url'])) : '';
            if (!$webapp_url) {
                wp_send_json_error(array('message' => 'Falta webapp_url'), 400);
            }

            $url = add_query_arg(
                array(
                    '_ts' => time(),
                ),
                $webapp_url
            );

            $response = wp_remote_get(
                $url,
                array(
                    'timeout' => 20,
                    'redirection' => 5,
                )
            );

            if (is_wp_error($response)) {
                wp_send_json_error(array('message' => $response->get_error_message()), 502);
            }

            $code = wp_remote_retrieve_response_code($response);
            $body = wp_remote_retrieve_body($response);
            if ($code < 200 || $code >= 300 || !$body) {
                wp_send_json_error(array('message' => 'Resposta buida o no valida del Web App'), 502);
            }

            $json = json_decode($body, true);
            if (!is_array($json)) {
                wp_send_json_error(array('message' => 'El Web App no ha retornat JSON valid'), 502);
            }

            wp_send_json_success($json);
        }
        add_action('wp_ajax_jpre_taller_data', 'jpre_taller_single_snippet_proxy_data');
        add_action('wp_ajax_nopriv_jpre_taller_data', 'jpre_taller_single_snippet_proxy_data');
    }

    function jpre_taller_single_snippet_shortcode($atts = array()) {
        static $instance = 0;
        static $script_printed = false;
        $instance++;

        $atts = shortcode_atts(
            array(
                'num' => '',
                'id' => '',
                'nom' => '',
                'franja' => '',
                'webapp_url' => 'https://script.google.com/macros/s/AKfycbwnlk1OhghSo_PCC5xXZnqKqc7TVUZFJrexK-PxSCxp0ODWSA0ebfV0XKThSxDFFi7h/exec',
            ),
            $atts,
            'jpre_taller'
        );

        $instance_id = 'jpre-taller-page-' . $instance;

        $script = '';
        if (!$script_printed) {
            $script_printed = true;
            $script = <<<'HTML'
<script>
(function(){if(window.__jpreSingleSnippetInit)return;window.__jpreSingleSnippetInit=true;
function normalize(v){return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim()}
function nonce(){return Date.now()+"_"+Math.random().toString(36).slice(2,10)}
function fetchViaWp(webAppUrl){return new Promise(function(resolve,reject){var ajax=(window.ajaxurl||"/wp-admin/admin-ajax.php"),url=ajax+"?action=jpre_taller_data&webapp_url="+encodeURIComponent(webAppUrl)+"&_ts="+encodeURIComponent(nonce());fetch(url,{credentials:"same-origin"}).then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}).then(function(payload){if(!payload||payload.success!==true||!payload.data)throw new Error((payload&&payload.data&&payload.data.message)||"Resposta no valida");resolve(payload.data)}).catch(reject)})}
function avState(a,t){var r=t===0?0:a/t;if(r>=.6)return"high";if(r>=.25)return"mid";return"low"}
function driveCandidates(url){var v=String(url||"").trim();if(!v)return[];var byPath=v.match(/\/file\/d\/([^/]+)/),byId=v.match(/[?&]id=([^&]+)/),id=(byPath&&byPath[1])||(byId&&byId[1])||"";if(!id)return[v];return["https://drive.google.com/thumbnail?id="+id+"&sz=w1200","https://drive.google.com/uc?export=view&id="+id,"https://drive.google.com/uc?export=download&id="+id]}
function setImage(img,src){var c=driveCandidates(src);if(!c.length){img.classList.add("is-hidden");img.removeAttribute("src");return false}var i=0;img.onerror=function(){i++;if(i>=c.length){img.classList.add("is-hidden");img.removeAttribute("src");img.onerror=null;return}img.src=c[i]};img.classList.remove("is-hidden");img.src=c[i];return true}
function flatten(d){var rows=[];(d.franges||[]).forEach(function(f){(f.tallers||[]).forEach(function(t){rows.push(Object.assign({},t,{franja:f.nom}))})});return rows}
function txt(v,f){var x=String(v||"").trim();return x||f}
function initCard(root){
  if(root.dataset.jpreInitDone==="1")return;root.dataset.jpreInitDone="1";
  var webAppUrl=root.dataset.webappUrl||"",targetNum=String(root.dataset.num||"").trim(),targetId=String(root.dataset.tallerId||"").trim(),targetNom=String(root.dataset.tallerNom||"").trim(),targetFranja=String(root.dataset.franja||"").trim();
  var el={title:root.querySelector(".jpre-title"),chipFranja:root.querySelector(".jpre-chip-franja"),chipEtapa:root.querySelector(".jpre-chip-etapa"),chipAula:root.querySelector(".jpre-chip-aula"),loading:root.querySelector(".jpre-loading"),error:root.querySelector(".jpre-error"),main:root.querySelector(".jpre-main"),descripcio:root.querySelector(".jpre-descripcio"),imparteix:root.querySelector(".jpre-imparteix"),foto1:root.querySelector(".jpre-foto-1"),foto2:root.querySelector(".jpre-foto-2"),photosWrap:root.querySelector(".jpre-photos"),dispositiu:root.querySelector(".jpre-dispositiu"),deviceImg:root.querySelector(".jpre-device-img"),material:root.querySelector(".jpre-material")};
  function showError(m){el.loading.classList.add("is-hidden");el.main.classList.add("is-hidden");el.error.textContent=m;el.error.classList.remove("is-hidden")}
  function findTaller(all){
    if(targetNum){var byNum=all.find(function(t){return String(t.num||"").trim()===targetNum});if(byNum)return byNum}
    if(targetId){var byId=all.find(function(t){return String(t.id||"").trim()===targetId});if(byId)return byId}
    if(!targetNom)return null;var nomN=normalize(targetNom),frN=normalize(targetFranja);
    var exact=all.find(function(t){return normalize(t.nom)===nomN&&(!frN||normalize(t.franja)===frN)});if(exact)return exact;
    return all.find(function(t){return normalize(t.nom).includes(nomN)&&(!frN||normalize(t.franja)===frN)})||null
  }
  function render(t){
    el.title.textContent=txt(t.nom,"Taller");
    el.chipFranja.textContent="Franja: "+txt(t.franja,"No informat");
    el.chipEtapa.textContent="Etapa: "+txt(t.etapaEducativa,"No informada");
    el.chipAula.textContent="Aula: "+txt(t.aula,"No informada");
    el.descripcio.textContent=txt(t.descripcio,"No informat");
    el.imparteix.textContent=txt(t.imparteix,"No informat");
    el.dispositiu.textContent=txt(t.dispositiuTecnologia,"No informat");
    el.material.textContent=txt(t.materialNecessari,"No informat");
    var has1=setImage(el.foto1,t.foto1Url),has2=setImage(el.foto2,t.foto2Url);
    if(!has1&&!has2)el.photosWrap.classList.add("is-hidden");else el.photosWrap.classList.remove("is-hidden");
    setImage(el.deviceImg,t.imatgeDispositiuUrl);
    el.loading.classList.add("is-hidden");el.error.classList.add("is-hidden");el.main.classList.remove("is-hidden");
  }
  if(!webAppUrl){showError("Falta data-webapp-url al shortcode.");return}
  fetchViaWp(webAppUrl).then(function(data){
    if(!data||!Array.isArray(data.franges)){showError("Resposta no valida del servidor.");return}
    var taller=findTaller(flatten(data));
    if(!taller){showError("No s'ha trobat el taller. Revisa num del shortcode.");return}
    render(taller);
  }).catch(function(err){console.error("JPRE error",err,"URL:",webAppUrl);showError("No s'ha pogut carregar la fitxa. Error de connexio amb el Web App.");});
}
function boot(){document.querySelectorAll(".jpre-taller-page").forEach(initCard)}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",boot)}else{boot()}
setTimeout(boot,300);
})();
</script>
HTML;
        }

        ob_start();
        echo $script;
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
              <div class="jpre-box jpre-box--description">
                <h3>Descripció del taller</h3>
                <p class="jpre-text jpre-descripcio"></p>
              </div>

              <div class="jpre-secondary">
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
              </div>
            </section>
          </div>
        </section>
        <?php
        return ob_get_clean();
    }

    add_shortcode('jpre_taller', 'jpre_taller_single_snippet_shortcode');
}
