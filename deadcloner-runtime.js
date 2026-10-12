
(function () {
  "use strict";
  function pronto(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  pronto(function () {
    ancorasSuaves();
    var interativo = document.documentElement.getAttribute("data-dc-interativo") !== "0";
    if (interativo) {
      try { ligarSelecao(); } catch (e) {}
      try { ligarToggles(); } catch (e) {}
      try { ligarCarrosseis(); } catch (e) {}
    }
  });

  var ATTRS_ESTADO = [
    "aria-selected", "aria-current", "aria-checked", "aria-pressed",
    "data-state", "data-active", "data-selected",
  ];

  function assinatura(el) {
    var sel = "";
    for (var i = 0; i < ATTRS_ESTADO.length; i++) sel += (el.getAttribute(ATTRS_ESTADO[i]) || "") + ",";
    return (el.className || "") + "§" + sel + "§" + (el.hasAttribute("hidden") ? "1" : "0");
  }
  function mapaAssin(root) {
    var m = {};
    m[""] = { el: root, sig: assinatura(root) };
    (function go(el, p) {
      var k = el.children;
      for (var i = 0; i < k.length; i++) {
        var np = p + "/" + i;
        m[np] = { el: k[i], sig: assinatura(k[i]) };
        go(k[i], np);
      }
    })(root, "");
    return m;
  }

  function snap(el) {
    var o = { cls: el.className, attrs: {}, hidden: el.hasAttribute("hidden") };
    for (var i = 0; i < ATTRS_ESTADO.length; i++) o.attrs[ATTRS_ESTADO[i]] = el.getAttribute(ATTRS_ESTADO[i]);
    return o;
  }

  function inferirEstado(filhos) {
    var maps = filhos.map(mapaAssin);
    var comuns = Object.keys(maps[0]).filter(function (k) {
      return maps.every(function (m) { return k in m; });
    });
    var diffs = [];
    var ativoIdx = -1;
    for (var c = 0; c < comuns.length; c++) {
      var p = comuns[c];
      var sigs = maps.map(function (m) { return m[p].sig; });
      var uq = sigs.filter(function (v, i) { return sigs.indexOf(v) === i; });
      if (uq.length !== 2) continue;
      var cont = {};
      sigs.forEach(function (s) { cont[s] = (cont[s] || 0) + 1; });
      var min = uq.filter(function (s) { return cont[s] === 1; })[0];
      if (!min) continue;
      var idx = sigs.indexOf(min);
      if (ativoIdx === -1) ativoIdx = idx;
      if (idx !== ativoIdx) return null;
      var baseIdx = idx === 0 ? 1 : 0;
      diffs.push({ path: p, active: snap(maps[idx][p].el), base: snap(maps[baseIdx][p].el) });
    }
    if (ativoIdx < 0 || !diffs.length) return null;
    return diffs;
  }

  function resolvePath(root, p) {
    if (p === "") return root;
    var el = root;
    var partes = p.split("/");
    for (var i = 0; i < partes.length; i++) {
      if (partes[i] === "") continue;
      if (!el) return null;
      el = el.children[+partes[i]];
    }
    return el;
  }

  function aplicarSnap(el, s) {
    if (!el) return;
    el.className = s.cls;
    if (s.hidden) el.setAttribute("hidden", "");
    else el.removeAttribute("hidden");
    for (var a in s.attrs) {
      if (s.attrs[a] == null) el.removeAttribute(a);
      else el.setAttribute(a, s.attrs[a]);
    }
  }

  function wireGrupo(filhos, diffs) {
    filhos.forEach(function (filho) {
      filho.addEventListener("click", function (e) {
        e.preventDefault();
        filhos.forEach(function (f) {
          var on = f === filho;
          diffs.forEach(function (d) {
            aplicarSnap(resolvePath(f, d.path), on ? d.active : d.base);
          });
        });
      }, false);
      try { if (getComputedStyle(filho).cursor === "auto") filho.style.cursor = "pointer"; } catch (e) {}
    });
  }

  function ligarSelecao() {
    var pais = [];
    var push = function (el) { if (el && pais.indexOf(el) < 0) pais.push(el); };
    document
      .querySelectorAll(
        "a,button,li,label,[role='option'],[role='tab'],[role='radio']," +
        "[class*='card'],[class*='item'],[class*='option'],[class*='tab'],[class*='choice']"
      )
      .forEach(function (el) { push(el.parentElement); });

    var feitos = [];
    pais.forEach(function (pai) {
      if (feitos.some(function (g) { return g === pai || g.contains(pai) || pai.contains(g); })) return;
      var filhos = Array.prototype.filter.call(pai.children, function (c) { return c.nodeType === 1; });
      if (filhos.length < 3) return;
      var tag = filhos[0].tagName;
      if (!filhos.every(function (f) { return f.tagName === tag; })) return;
      var diffs = inferirEstado(filhos);
      if (diffs && diffs.length >= 1 && diffs.length <= 10) {
        wireGrupo(filhos, diffs);
        feitos.push(pai);
      }
    });
  }

  function ancorasSuaves() {
    try {
      document.addEventListener("click", function (ev) {
        var a = ev.target && ev.target.closest ? ev.target.closest('a[href^="#"]') : null;
        if (!a) return;
        var id = a.getAttribute("href").slice(1);
        if (!id) return;
        var alvo = document.getElementById(id) || document.querySelector('[name="' + id + '"]');
        if (alvo) {
          ev.preventDefault();
          alvo.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    } catch (e) {}
  }

  var CLASSES_ABERTO = ["active", "open", "show", "is-active", "is-open", "expanded", "visible"];
  function toggleClasses(el) {
    var mudou = false;
    for (var i = 0; i < CLASSES_ABERTO.length; i++) {
      var c = CLASSES_ABERTO[i];
      if (document.querySelector("." + c) || el.classList.contains(c)) {
        el.classList.toggle(c);
        mudou = true;
      }
    }
    if (!mudou) el.classList.toggle("active");
  }

  function ligarToggles() {
    var sel =
      "[aria-controls],[data-toggle],[data-target],[aria-haspopup]," +
      ".hamburger,.menu-toggle,.navbar-toggle,.navbar-toggler,.nav-toggle,.burger,.menu-btn";
    document.querySelectorAll(sel).forEach(function (g) {
      g.addEventListener("click", function (ev) {
        var alvo = acharAlvo(g);
        if (alvo) {
          ev.preventDefault();
          toggleClasses(alvo);
          var exp = g.getAttribute("aria-expanded");
          if (exp !== null) g.setAttribute("aria-expanded", exp === "true" ? "false" : "true");
        } else {
          g.classList.toggle("active");
        }
      });
    });
    document.querySelectorAll('[role="tab"]').forEach(function (tab) {
      tab.addEventListener("click", function () {
        var grupo = tab.closest('[role="tablist"]');
        if (grupo) {
          grupo.querySelectorAll('[role="tab"]').forEach(function (t) {
            t.setAttribute("aria-selected", "false");
            t.classList.remove("active");
          });
        }
        tab.setAttribute("aria-selected", "true");
        tab.classList.add("active");
        var id = tab.getAttribute("aria-controls");
        var painel = id ? document.getElementById(id) : null;
        if (painel && painel.parentElement) {
          painel.parentElement.querySelectorAll('[role="tabpanel"]').forEach(function (p) {
            p.hidden = true;
            p.classList.remove("active", "show");
          });
          painel.hidden = false;
          painel.classList.add("active", "show");
        }
      });
    });
  }

  function acharAlvo(g) {
    try {
      var id = g.getAttribute("aria-controls") || g.getAttribute("data-target");
      if (id) {
        var s = id.charAt(0) === "#" || id.charAt(0) === "." ? id : "#" + id;
        var el = document.querySelector(s);
        if (el) return el;
      }
      var irmao = g.nextElementSibling;
      if (irmao && /menu|dropdown|submenu|nav/i.test(irmao.className)) return irmao;
      var pai = g.parentElement;
      if (pai) {
        var m = pai.querySelector(".menu,.dropdown-menu,.submenu,[role='menu']");
        if (m && m !== g) return m;
      }
    } catch (e) {}
    return null;
  }

  function ligarCarrosseis() {
    var conts = document.querySelectorAll(
      "[class*='carousel'],[class*='slider'],[class*='swiper'],[class*='slick']," +
      "[class*='splide'],[class*='glide'],[data-carousel],[data-slider]"
    );
    var vistos = [];
    conts.forEach(function (c) {
      for (var i = 0; i < vistos.length; i++) if (vistos[i].contains(c)) return;
      vistos.push(c);
      montarCarrossel(c);
    });
  }

  function montarCarrossel(cont) {
    try {
      var track =
        cont.querySelector(
          ".swiper-wrapper,.slick-track,.splide__list,.glide__slides,[class*='track'],[class*='wrapper']"
        ) || cont;
      var slides = Array.prototype.filter.call(track.children, function (el) { return el.nodeType === 1; });
      if (slides.length < 2) return;

      var r0 = slides[0].getBoundingClientRect();
      var r1 = slides[1].getBoundingClientRect();
      var horizontal = Math.abs(r1.left - r0.left) > Math.abs(r1.top - r0.top) && r1.left !== r0.left;
      var idx = 0;

      var irPara = function (i) {
        idx = (i + slides.length) % slides.length;
        if (horizontal) {
          var alvo = slides[idx];
          if (track.scrollWidth > track.clientWidth + 4) {
            track.scrollTo({ left: alvo.offsetLeft - track.offsetLeft, behavior: "smooth" });
          } else {
            track.style.transition = "transform .6s cubic-bezier(.16,1,.3,1)";
            track.style.transform = "translateX(" + -alvo.offsetLeft + "px)";
          }
        } else {
          slides.forEach(function (s, j) { s.style.display = j === idx ? "" : "none"; });
        }
        slides.forEach(function (s, j) { s.classList.toggle("active", j === idx); });
      };

      var prox = cont.querySelector(
        "[class*='next'],[aria-label*='next' i],[aria-label*='prox' i],.swiper-button-next,.slick-next"
      );
      var ant = cont.querySelector(
        "[class*='prev'],[aria-label*='prev' i],[aria-label*='ante' i],.swiper-button-prev,.slick-prev"
      );
      var manual = false;
      var parar = function () { if (!manual) { clearInterval(timer); manual = true; } };
      if (prox) prox.addEventListener("click", function (e) { e.preventDefault(); parar(); irPara(idx + 1); });
      if (ant) ant.addEventListener("click", function (e) { e.preventDefault(); parar(); irPara(idx - 1); });

      var timer = setInterval(function () { irPara(idx + 1); }, 3800);
      cont.addEventListener("mouseenter", function () { clearInterval(timer); });
      cont.addEventListener("mouseleave", function () {
        if (!manual) timer = setInterval(function () { irPara(idx + 1); }, 3800);
      });
    } catch (e) {}
  }
})();
