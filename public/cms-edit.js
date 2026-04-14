/**
 * CMS Inline Editor v1.0
 * Edition visuelle inline pour le CMS maison Web Factory.
 *
 * Charge uniquement quand le cookie cms_logged_in existe (injection conditionnelle
 * dans BaseLayout.astro). Aucun impact perf/SEO pour les visiteurs normaux.
 *
 * Fonctionnalites :
 * - Texte : contenteditable inline sur les champs data-cms-field/data-cms-type="text"
 * - Images : overlay "Changer" sur data-cms-type="image" (galerie R2 + upload)
 * - Styles : panneau lateral couleurs/radius, preview live + save theme.json
 * - Save batch : regroupe par fichier JSON, fetch sha, merge, POST /api/cms/save
 * - Mobile-first : toolbar responsive, boutons tactiles
 *
 * Conventions data-cms-field :
 * - Singleton : "hero.title" -> src/content/hero/index.json .title
 * - Collection : "faq:budget.question" -> src/content/faq/budget.json .question
 * - Array item : "painpoints.questions[2]" -> src/content/painpoints/index.json .questions[2]
 * - Array obj  : "process.phases[0].title" -> src/content/process/index.json .phases[0].title
 */
(function () {
  'use strict';

  // --- State ---
  var editMode = false;
  var modifications = {};
  var originalValues = {};
  var editButton = null;
  var toolbar = null;
  var themePanel = null;
  var imageModal = null;
  var currentImageField = null;
  var themeOriginal = null;
  var themeModifications = {};

  // --- Config (chargee depuis /cms-config.json, optionnel) ---
  var cmsConfig = {
    colors: { primary: '#2563eb', accent: '#059669', dark: '#0f172a' },
    pageNames: {},
  };

  // --- Field path parser ---
  function parseFieldPath(fieldPath) {
    if (!fieldPath || (fieldPath.indexOf('.') === -1 && fieldPath.indexOf(':') === -1)) {
      console.warn('CMS: Chemin de champ invalide:', fieldPath);
      return null;
    }
    var colonIndex = fieldPath.indexOf(':');
    if (colonIndex !== -1) {
      // Collection: "faq:budget.question" -> src/content/faq/budget.json
      var collection = fieldPath.substring(0, colonIndex);
      var rest = fieldPath.substring(colonIndex + 1);
      var dotIndex = rest.indexOf('.');
      var slug = rest.substring(0, dotIndex);
      var field = rest.substring(dotIndex + 1);
      return { filePath: 'src/content/' + collection + '/' + slug + '.json', field: field };
    }

    // Array: "singleton.field[index]" or "singleton.field[index].subfield"
    var bracketMatch = fieldPath.match(/^([^.]+)\.([^[]+)\[(\d+)\](?:\.(.+))?$/);
    if (bracketMatch) {
      return {
        filePath: 'src/content/' + bracketMatch[1] + '/index.json',
        field: bracketMatch[2],
        index: parseInt(bracketMatch[3], 10),
        subfield: bracketMatch[4] || null,
      };
    }

    // Singleton: "hero.title" -> src/content/hero/index.json
    var dotIndex = fieldPath.indexOf('.');
    var singleton = fieldPath.substring(0, dotIndex);
    var field = fieldPath.substring(dotIndex + 1);
    return { filePath: 'src/content/' + singleton + '/index.json', field: field };
  }

  // --- Init ---
  function init() {
    if (!document.cookie.includes('cms_logged_in')) return;
    if (window.location.pathname.startsWith('/admin')) return;

    // Charger la config (optionnelle, fallback silencieux)
    fetch('/cms-config.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data) {
          if (data.colors) cmsConfig.colors = data.colors;
          if (data.pageNames) cmsConfig.pageNames = data.pageNames;
        }
        createEditButton();
      })
      .catch(function () {
        createEditButton();
      });
  }

  // =========================================================
  // BOUTON FLOTTANT (FAB)
  // =========================================================

  function createEditButton() {
    editButton = document.createElement('button');
    editButton.textContent = 'Modifier';
    editButton.setAttribute('aria-label', 'Activer le mode edition');
    Object.assign(editButton.style, {
      position: 'fixed', bottom: '24px', right: '24px', zIndex: '9999',
      padding: '12px 24px', background: cmsConfig.colors.primary, color: '#fff',
      border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
      cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      transition: 'all 0.2s ease',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });
    editButton.addEventListener('mouseenter', function () { editButton.style.transform = 'scale(1.05)'; });
    editButton.addEventListener('mouseleave', function () { editButton.style.transform = 'scale(1)'; });
    editButton.addEventListener('click', activateEditMode);
    document.body.appendChild(editButton);
  }

  // =========================================================
  // MODE EDITION
  // =========================================================

  function activateEditMode() {
    if (editMode) return;
    editMode = true;
    modifications = {};
    originalValues = {};
    themeModifications = {};

    if (editButton) editButton.style.display = 'none';

    // --- Texte ---
    var editables = document.querySelectorAll('[data-cms-field]');
    editables.forEach(function (el) {
      var field = el.getAttribute('data-cms-field');
      var type = el.getAttribute('data-cms-type') || 'text';

      if (type === 'text') {
        originalValues[field] = el.textContent || '';
        el.setAttribute('contenteditable', 'true');
        el.classList.add('cms-editable');
        el._cmsHandlers = { focus: handleFocus, blur: handleBlur, input: handleInput, keydown: handleKeydown };
        el.addEventListener('focus', el._cmsHandlers.focus);
        el.addEventListener('blur', el._cmsHandlers.blur);
        el.addEventListener('input', el._cmsHandlers.input);
        el.addEventListener('keydown', el._cmsHandlers.keydown);
      }

      if (type === 'richtext') {
        originalValues[field] = el.innerHTML || '';
        el.setAttribute('contenteditable', 'true');
        el.classList.add('cms-editable', 'cms-editable-richtext');
        el._cmsHandlers = { focus: handleFocus, blur: handleBlur, input: handleInput, keydown: handleKeydown };
        el.addEventListener('focus', el._cmsHandlers.focus);
        el.addEventListener('blur', el._cmsHandlers.blur);
        el.addEventListener('input', el._cmsHandlers.input);
        el.addEventListener('keydown', el._cmsHandlers.keydown);
      }

      if (type === 'image') {
        originalValues[field] = el.getAttribute('src') || '';
        addImageOverlay(el, field);
      }
    });

    createToolbar();
    injectStyles();

    // Flash pour montrer les champs editables
    editables.forEach(function (el) {
      el.classList.add('cms-editable-flash');
    });
    setTimeout(function () {
      document.querySelectorAll('.cms-editable-flash').forEach(function (el) {
        el.classList.remove('cms-editable-flash');
      });
    }, 1500);
  }

  function deactivateEditMode() {
    editMode = false;

    document.querySelectorAll('[data-cms-field]').forEach(function (el) {
      var type = el.getAttribute('data-cms-type') || 'text';
      if (type === 'text' || type === 'richtext') {
        el.removeAttribute('contenteditable');
        el.classList.remove('cms-editable', 'cms-editable-focus', 'cms-editable-richtext');
        if (el._cmsHandlers) {
          el.removeEventListener('focus', el._cmsHandlers.focus);
          el.removeEventListener('blur', el._cmsHandlers.blur);
          el.removeEventListener('input', el._cmsHandlers.input);
          el.removeEventListener('keydown', el._cmsHandlers.keydown);
          delete el._cmsHandlers;
        }
      }
    });

    // Retirer overlays image
    document.querySelectorAll('.cms-image-overlay').forEach(function (o) { o.remove(); });

    if (toolbar) { toolbar.remove(); toolbar = null; }
    if (themePanel) { themePanel.remove(); themePanel = null; }
    if (imageModal) { imageModal.remove(); imageModal = null; }
    if (editButton) editButton.style.display = '';

    modifications = {};
    originalValues = {};
    themeModifications = {};
  }

  function cancelChanges() {
    // Restaurer textes et images
    for (var field in originalValues) {
      var el = document.querySelector('[data-cms-field="' + field + '"]');
      if (!el) continue;
      var type = el.getAttribute('data-cms-type') || 'text';
      if (type === 'text') el.textContent = originalValues[field];
      if (type === 'richtext') el.innerHTML = originalValues[field];
      if (type === 'image') el.setAttribute('src', originalValues[field]);
    }
    // Restaurer couleurs
    if (themeOriginal) {
      applyThemeColors(themeOriginal);
    }
    deactivateEditMode();
    showToast('Modifications annul\u00e9es', 'info');
  }

  function quitEditMode() {
    var modCount = Object.keys(modifications).length + Object.keys(themeModifications).length;
    if (modCount > 0) {
      if (!window.confirm('Vous avez ' + modCount + ' modification(s) non enregistr\u00e9e(s). Quitter sans sauvegarder ?')) {
        return;
      }
      cancelChanges();
    } else {
      deactivateEditMode();
    }
  }

  // =========================================================
  // TEXTE -- Event handlers
  // =========================================================

  function handleFocus(e) { e.target.classList.add('cms-editable-focus'); }
  function handleBlur(e) { e.target.classList.remove('cms-editable-focus'); }

  function handleInput(e) {
    var el = e.target;
    var field = el.getAttribute('data-cms-field');
    var type = el.getAttribute('data-cms-type') || 'text';
    var newValue = type === 'richtext' ? (el.innerHTML || '') : (el.textContent || '');
    if (newValue !== originalValues[field]) {
      modifications[field] = newValue;
    } else {
      delete modifications[field];
    }
    updateToolbarCount();
  }

  function handleKeydown(e) {
    var type = e.target.getAttribute('data-cms-type');
    // Pas de retour a la ligne dans les champs text (seulement richtext)
    if (type === 'text' && e.key === 'Enter') e.preventDefault();
    // Cmd+S / Ctrl+S pour sauvegarder
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveChanges();
    }
  }

  // =========================================================
  // IMAGES -- Overlay + Modal galerie/upload
  // =========================================================

  function addImageOverlay(imgEl, field) {
    var wrapper = imgEl.parentElement;
    if (!wrapper) return;
    wrapper.style.position = 'relative';

    var overlay = document.createElement('div');
    overlay.className = 'cms-image-overlay';
    Object.assign(overlay.style, {
      position: 'absolute', top: '0', left: '0', right: '0', bottom: '0',
      background: 'rgba(0,0,0,0.6)', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '8px', opacity: '0', transition: 'opacity 0.2s ease',
      cursor: 'pointer', borderRadius: getComputedStyle(imgEl).borderRadius,
      zIndex: '10',
    });

    var icon = document.createElement('span');
    icon.textContent = '\ud83d\udcf7';
    icon.style.fontSize = '28px';

    var label = document.createElement('span');
    label.textContent = 'Changer';
    Object.assign(label.style, {
      color: '#fff', fontSize: '13px', fontWeight: '600',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });

    overlay.appendChild(icon);
    overlay.appendChild(label);

    overlay.addEventListener('mouseenter', function () { overlay.style.opacity = '1'; });
    overlay.addEventListener('mouseleave', function () { overlay.style.opacity = '0'; });
    overlay.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      currentImageField = field;
      openImageModal(imgEl);
    });

    wrapper.appendChild(overlay);
  }

  function openImageModal(targetImg) {
    if (imageModal) imageModal.remove();

    imageModal = document.createElement('div');
    imageModal.id = 'cms-image-modal';
    Object.assign(imageModal.style, {
      position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
      background: 'rgba(0,0,0,0.7)', zIndex: '10002',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });

    var panel = document.createElement('div');
    Object.assign(panel.style, {
      background: '#fff', borderRadius: '16px', padding: '24px',
      width: '90vw', maxWidth: '640px', maxHeight: '80vh',
      overflow: 'auto', position: 'relative',
    });

    // Header
    var header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '16px',
    });

    var title = document.createElement('h3');
    title.textContent = 'Choisir une image';
    Object.assign(title.style, { margin: '0', fontSize: '18px', fontWeight: '600', color: cmsConfig.colors.dark });

    var closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.setAttribute('aria-label', 'Fermer');
    Object.assign(closeBtn.style, {
      background: 'none', border: 'none', fontSize: '20px',
      cursor: 'pointer', color: '#71717a', padding: '4px 8px',
    });
    closeBtn.addEventListener('click', function () { imageModal.remove(); imageModal = null; });

    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Upload zone
    var uploadZone = document.createElement('div');
    Object.assign(uploadZone.style, {
      border: '2px dashed #d1d5db', borderRadius: '12px', padding: '20px',
      textAlign: 'center', marginBottom: '20px', cursor: 'pointer',
      transition: 'border-color 0.2s, background 0.2s',
    });
    uploadZone.innerHTML = '<p style="margin:0;color:#71717a;font-size:14px;">' +
      '\ud83d\udcc1 Glissez une image ici ou <strong>parcourir</strong></p>' +
      '<p style="margin:4px 0 0;color:#a0a0a8;font-size:12px;">JPG, PNG, WebP, SVG, GIF</p>';

    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/png,image/webp,image/svg+xml,image/gif';
    fileInput.style.display = 'none';

    uploadZone.addEventListener('click', function () { fileInput.click(); });
    uploadZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      uploadZone.style.borderColor = cmsConfig.colors.primary;
      uploadZone.style.background = '#f5f5ff';
    });
    uploadZone.addEventListener('dragleave', function () {
      uploadZone.style.borderColor = '#d1d5db';
      uploadZone.style.background = '';
    });
    uploadZone.addEventListener('drop', function (e) {
      e.preventDefault();
      uploadZone.style.borderColor = '#d1d5db';
      uploadZone.style.background = '';
      if (e.dataTransfer.files.length > 0) uploadImage(e.dataTransfer.files[0], targetImg);
    });
    fileInput.addEventListener('change', function () {
      if (fileInput.files.length > 0) uploadImage(fileInput.files[0], targetImg);
    });

    panel.appendChild(uploadZone);
    panel.appendChild(fileInput);

    // Galerie
    var galTitle = document.createElement('p');
    galTitle.textContent = 'Images existantes';
    Object.assign(galTitle.style, {
      fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px',
    });
    panel.appendChild(galTitle);

    var grid = document.createElement('div');
    Object.assign(grid.style, {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
      gap: '8px',
    });
    panel.appendChild(grid);

    var loader = document.createElement('p');
    loader.textContent = 'Chargement...';
    Object.assign(loader.style, { color: '#94a3b8', fontSize: '13px', textAlign: 'center' });
    grid.appendChild(loader);

    imageModal.appendChild(panel);
    document.body.appendChild(imageModal);

    // Fermer en cliquant en dehors
    imageModal.addEventListener('click', function (e) {
      if (e.target === imageModal) { imageModal.remove(); imageModal = null; }
    });

    loadImageGallery(grid, targetImg);
  }

  function loadImageGallery(grid, targetImg) {
    fetch('/api/cms/images')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        grid.innerHTML = '';
        var images = data.images || [];
        if (images.length === 0) {
          grid.innerHTML = '<p style="color:#94a3b8;font-size:13px;grid-column:1/-1;text-align:center;">Aucune image</p>';
          return;
        }
        images.forEach(function (img) {
          var thumb = document.createElement('div');
          Object.assign(thumb.style, {
            aspectRatio: '1', borderRadius: '8px', overflow: 'hidden',
            cursor: 'pointer', border: '2px solid transparent',
            transition: 'border-color 0.15s',
          });
          var imgEl = document.createElement('img');
          imgEl.src = img.url;
          imgEl.alt = img.name || '';
          imgEl.style.cssText = 'width:100%;height:100%;object-fit:cover;';
          thumb.appendChild(imgEl);
          thumb.addEventListener('mouseenter', function () { thumb.style.borderColor = cmsConfig.colors.primary; });
          thumb.addEventListener('mouseleave', function () { thumb.style.borderColor = 'transparent'; });
          thumb.addEventListener('click', function () {
            selectImage(img.url, targetImg);
          });
          grid.appendChild(thumb);
        });
      })
      .catch(function () {
        grid.innerHTML = '<p style="color:#dc2626;font-size:13px;">Erreur de chargement</p>';
      });
  }

  function uploadImage(file, targetImg) {
    var formData = new FormData();
    formData.append('file', file);

    showToast('Upload en cours...', 'info');

    fetch('/api/cms/upload', { method: 'POST', body: formData })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (d) { throw new Error(d.error); });
        return r.json();
      })
      .then(function (data) {
        selectImage(data.url, targetImg);
        showToast('Image upload\u00e9e', 'success');
      })
      .catch(function (err) {
        showToast('Erreur : ' + err.message, 'error');
      });
  }

  function selectImage(url, targetImg) {
    targetImg.setAttribute('src', url);
    modifications[currentImageField] = url;
    updateToolbarCount();
    if (imageModal) { imageModal.remove(); imageModal = null; }
  }

  // =========================================================
  // STYLES -- Panneau lateral
  // =========================================================

  function toggleThemePanel() {
    if (themePanel) {
      themePanel.remove();
      themePanel = null;
      return;
    }
    createThemePanel();
  }

  function createThemePanel() {
    fetch('/api/cms/content?path=' + encodeURIComponent('src/content/theme/index.json'))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        themeOriginal = Object.assign({}, data.content);
        renderThemePanel(data.content);
      })
      .catch(function () {
        // Fallback generique si theme.json n'existe pas
        themeOriginal = {
          primaryColor: cmsConfig.colors.primary,
          accentColor: cmsConfig.colors.accent,
          darkBg: '#242b31',
          bodyText: '#272727',
          borderRadius: '8',
        };
        renderThemePanel(themeOriginal);
      });
  }

  function renderThemePanel(theme) {
    themePanel = document.createElement('div');
    themePanel.id = 'cms-theme-panel';
    Object.assign(themePanel.style, {
      position: 'fixed', top: '0', right: '0', bottom: '64px',
      width: '300px', background: '#fff', zIndex: '10001',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', overflowY: 'auto',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      transform: 'translateX(100%)', transition: 'transform 0.25s ease',
    });

    var inner = document.createElement('div');
    inner.style.padding = '24px';

    // Header
    var header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '24px',
    });
    var h3 = document.createElement('h3');
    h3.textContent = 'Styles';
    Object.assign(h3.style, { margin: '0', fontSize: '18px', fontWeight: '600', color: cmsConfig.colors.dark });
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.setAttribute('aria-label', 'Fermer le panneau styles');
    Object.assign(closeBtn.style, {
      background: 'none', border: 'none', fontSize: '18px',
      cursor: 'pointer', color: '#71717a',
    });
    closeBtn.addEventListener('click', function () { themePanel.remove(); themePanel = null; });
    header.appendChild(h3);
    header.appendChild(closeBtn);
    inner.appendChild(header);

    // Color pickers
    var colors = [
      { key: 'primaryColor', label: 'Couleur principale', cssVar: '--color-primary-500' },
      { key: 'accentColor', label: 'Couleur accent', cssVar: '--color-accent-500' },
      { key: 'darkBg', label: 'Fond sombre', cssVar: '--color-dark-grey' },
      { key: 'bodyText', label: 'Texte corps', cssVar: '--color-body-dark' },
    ];

    colors.forEach(function (c) {
      var group = document.createElement('div');
      group.style.marginBottom = '20px';

      var label = document.createElement('label');
      label.textContent = c.label;
      Object.assign(label.style, {
        display: 'block', fontSize: '13px', fontWeight: '500',
        color: '#374151', marginBottom: '6px',
      });

      var row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex', alignItems: 'center', gap: '10px',
      });

      var colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = theme[c.key] || '#000000';
      Object.assign(colorInput.style, {
        width: '44px', height: '36px', border: '1px solid #d1d5db',
        borderRadius: '8px', cursor: 'pointer', padding: '2px',
      });

      var hexInput = document.createElement('input');
      hexInput.type = 'text';
      hexInput.value = theme[c.key] || '';
      hexInput.maxLength = 7;
      Object.assign(hexInput.style, {
        flex: '1', padding: '6px 10px', border: '1px solid #d1d5db',
        borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace',
      });

      colorInput.addEventListener('input', function () {
        hexInput.value = colorInput.value;
        applyThemeColor(c.key, c.cssVar, colorInput.value);
      });

      hexInput.addEventListener('input', function () {
        if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) {
          colorInput.value = hexInput.value;
          applyThemeColor(c.key, c.cssVar, hexInput.value);
        }
      });

      row.appendChild(colorInput);
      row.appendChild(hexInput);
      group.appendChild(label);
      group.appendChild(row);
      inner.appendChild(group);
    });

    // Border radius slider
    var radiusGroup = document.createElement('div');
    radiusGroup.style.marginBottom = '20px';

    var radiusLabel = document.createElement('label');
    radiusLabel.textContent = 'Arrondi boutons';
    Object.assign(radiusLabel.style, {
      display: 'block', fontSize: '13px', fontWeight: '500',
      color: '#374151', marginBottom: '6px',
    });

    var radiusRow = document.createElement('div');
    Object.assign(radiusRow.style, { display: 'flex', alignItems: 'center', gap: '10px' });

    var radiusSlider = document.createElement('input');
    radiusSlider.type = 'range';
    radiusSlider.min = '0';
    radiusSlider.max = '50';
    radiusSlider.value = theme.borderRadius || '8';
    Object.assign(radiusSlider.style, { flex: '1', accentColor: cmsConfig.colors.primary });

    var radiusValue = document.createElement('span');
    radiusValue.textContent = (theme.borderRadius || '8') + 'px';
    Object.assign(radiusValue.style, {
      fontSize: '13px', fontFamily: 'monospace', color: '#71717a', minWidth: '36px',
    });

    radiusSlider.addEventListener('input', function () {
      radiusValue.textContent = radiusSlider.value + 'px';
      themeModifications.borderRadius = radiusSlider.value;
      document.querySelectorAll('.btn-gradient, .btn-outline-light, .btn-primary, .btn-secondary').forEach(function (btn) {
        btn.style.borderRadius = radiusSlider.value + 'px';
      });
      updateToolbarCount();
    });

    radiusRow.appendChild(radiusSlider);
    radiusRow.appendChild(radiusValue);
    radiusGroup.appendChild(radiusLabel);
    radiusGroup.appendChild(radiusRow);
    inner.appendChild(radiusGroup);

    // Reset
    var resetBtn = document.createElement('button');
    resetBtn.textContent = 'R\u00e9initialiser';
    Object.assign(resetBtn.style, {
      width: '100%', padding: '10px', background: 'transparent',
      border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px',
      color: '#71717a', cursor: 'pointer', marginTop: '12px',
    });
    resetBtn.addEventListener('click', function () {
      if (themeOriginal) {
        applyThemeColors(themeOriginal);
        themeModifications = {};
        themePanel.querySelectorAll('input[type="color"]').forEach(function (inp, i) {
          var key = colors[i].key;
          inp.value = themeOriginal[key];
          inp.nextElementSibling.value = themeOriginal[key];
        });
        radiusSlider.value = themeOriginal.borderRadius || '8';
        radiusValue.textContent = (themeOriginal.borderRadius || '8') + 'px';
        document.querySelectorAll('.btn-gradient, .btn-outline-light, .btn-primary, .btn-secondary').forEach(function (btn) {
          btn.style.borderRadius = '';
        });
        updateToolbarCount();
      }
    });
    inner.appendChild(resetBtn);

    themePanel.appendChild(inner);
    document.body.appendChild(themePanel);

    requestAnimationFrame(function () {
      themePanel.style.transform = 'translateX(0)';
    });
  }

  function applyThemeColor(key, cssVar, value) {
    themeModifications[key] = value;
    updateToolbarCount();

    // Preview live via CSS custom property
    document.documentElement.style.setProperty(cssVar, value);

    // Appliquer aussi directement sur les elements avec hex hardcode dans Tailwind
    var mapping = {
      primaryColor: { prop: 'primary', hex: null },
      accentColor: { prop: 'accent', hex: null },
      darkBg: { prop: 'dark', hex: null },
      bodyText: { prop: 'body', hex: null },
    };

    // Detecter la couleur d'origine pour les selectors Tailwind
    if (themeOriginal && themeOriginal[key]) {
      var origHex = themeOriginal[key].toLowerCase();
      document.querySelectorAll('[class*="' + origHex + '"]').forEach(function (el) {
        var classes = el.className || '';
        if (classes.indexOf('bg-[' + origHex + ']') !== -1) {
          el.style.backgroundColor = value;
        }
        if (classes.indexOf('text-[' + origHex + ']') !== -1) {
          el.style.color = value;
        }
        // Opacite (bg-[#hex]/50)
        var match = classes.match(new RegExp('bg-\\[' + origHex.replace('#', '\\#') + '\\]/(\\d+)'));
        if (match) {
          var opacity = parseInt(match[1]) / 100;
          el.style.backgroundColor = hexToRgba(value, opacity);
        }
      });
    }
  }

  function applyThemeColors(theme) {
    var mappings = {
      primaryColor: '--color-primary-500',
      accentColor: '--color-accent-500',
      darkBg: '--color-dark-grey',
      bodyText: '--color-body-dark',
    };
    for (var key in mappings) {
      if (theme[key]) {
        applyThemeColor(key, mappings[key], theme[key]);
      }
    }
  }

  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // =========================================================
  // TOOLBAR
  // =========================================================

  function getPageName() {
    var p = window.location.pathname.replace(/\/$/, '') || '/';
    if (cmsConfig.pageNames[p]) return cmsConfig.pageNames[p];
    var segment = p.replace(/^\//, '').split('/')[0] || 'Accueil';
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  }

  function createToolbar() {
    toolbar = document.createElement('div');
    toolbar.id = 'cms-toolbar';
    toolbar.innerHTML =
      '<div style="display:flex;align-items:center;gap:12px;min-width:0;">' +
        '<span style="font-size:18px;">&#9998;</span>' +
        '<span class="cms-toolbar-label" style="font-weight:600;font-size:14px;">Mode \u00e9dition</span>' +
        '<span class="cms-toolbar-label" style="font-size:12px;color:#94a3b8;opacity:0.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"> ' + getPageName() + '</span>' +
        '<span id="cms-toolbar-count" style="font-size:13px;color:#94a3b8;white-space:nowrap;"></span>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-shrink:0;">' +
        '<a id="cms-admin" href="/admin" title="Panneau d\'administration" style="' +
          'display:inline-flex;align-items:center;padding:8px 12px;background:transparent;color:#fff;' +
          'text-decoration:none;border:1px solid rgba(255,255,255,0.3);border-radius:8px;' +
          'font-size:13px;cursor:pointer;"><span class="cms-toolbar-label">Admin</span><span class="cms-toolbar-icon">&#9881;</span></a>' +
        '<button id="cms-theme-btn" title="Styles" style="' +
          'padding:8px 12px;background:transparent;color:#fff;' +
          'border:1px solid rgba(255,255,255,0.3);border-radius:8px;' +
          'font-size:16px;cursor:pointer;">\ud83c\udfa8</button>' +
        '<button id="cms-quit" title="Quitter le mode \u00e9dition" style="' +
          'padding:8px 12px;background:transparent;color:#fff;' +
          'border:1px solid rgba(255,255,255,0.3);border-radius:8px;' +
          'font-size:13px;cursor:pointer;"><span class="cms-toolbar-label">Quitter</span><span class="cms-toolbar-icon">\u2715</span></button>' +
        '<button id="cms-cancel" title="Annuler les modifications" style="' +
          'padding:8px 16px;background:transparent;color:#fff;' +
          'border:1px solid rgba(255,255,255,0.3);border-radius:8px;' +
          'font-size:13px;cursor:pointer;"><span class="cms-toolbar-label">Annuler</span><span class="cms-toolbar-icon">\u21a9</span></button>' +
        '<button id="cms-save" title="Enregistrer" style="' +
          'padding:8px 20px;background:' + cmsConfig.colors.accent + ';color:#fff;border:none;' +
          'border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;"><span class="cms-toolbar-label">Enregistrer</span><span class="cms-toolbar-icon">\ud83d\udcbe</span></button>' +
      '</div>';
    Object.assign(toolbar.style, {
      position: 'fixed', bottom: '0', left: '0', right: '0', zIndex: '10000',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 24px', background: cmsConfig.colors.dark, color: '#fff',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });

    document.body.appendChild(toolbar);

    toolbar.querySelector('#cms-cancel').addEventListener('click', cancelChanges);
    toolbar.querySelector('#cms-save').addEventListener('click', saveChanges);
    toolbar.querySelector('#cms-theme-btn').addEventListener('click', toggleThemePanel);
    toolbar.querySelector('#cms-quit').addEventListener('click', quitEditMode);

    updateToolbarCount();
  }

  function updateToolbarCount() {
    var count = document.getElementById('cms-toolbar-count');
    if (!count) return;
    var n = Object.keys(modifications).length + Object.keys(themeModifications).length;
    if (n === 0) {
      var total = document.querySelectorAll('[data-cms-field]').length;
      count.textContent = total + ' champ' + (total > 1 ? 's' : '') + ' \u00e9ditable' + (total > 1 ? 's' : '');
      count.style.color = '#94a3b8';
    } else {
      count.textContent = n + ' modification' + (n > 1 ? 's' : '');
      count.style.color = cmsConfig.colors.accent;
    }
  }

  // =========================================================
  // SAUVEGARDE EN BATCH
  // =========================================================

  function saveChanges() {
    var modKeys = Object.keys(modifications);
    var themeKeys = Object.keys(themeModifications);
    if (modKeys.length === 0 && themeKeys.length === 0) {
      showToast('Aucune modification', 'info');
      return;
    }

    var saveBtn = document.getElementById('cms-save');
    var cancelBtn = document.getElementById('cms-cancel');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Enregistrement...'; }
    if (cancelBtn) cancelBtn.disabled = true;

    // Grouper les modifs texte/image par fichier JSON
    var fileGroups = {};
    modKeys.forEach(function (fieldPath) {
      var parsed = parseFieldPath(fieldPath);
      if (!parsed) return;
      if (!fileGroups[parsed.filePath]) fileGroups[parsed.filePath] = [];
      fileGroups[parsed.filePath].push({
        field: parsed.field,
        index: parsed.index,
        subfield: parsed.subfield,
        value: modifications[fieldPath],
      });
    });

    // Ajouter le theme si modifie
    if (themeKeys.length > 0) {
      var themePath = 'src/content/theme/index.json';
      if (!fileGroups[themePath]) fileGroups[themePath] = [];
      themeKeys.forEach(function (k) {
        fileGroups[themePath].push({ field: k, value: themeModifications[k] });
      });
    }

    var filePaths = Object.keys(fileGroups);
    var index = 0;

    function processNext() {
      if (index >= filePaths.length) {
        showToast('Enregistre ! Votre site se met a jour.', 'success');
        modKeys.forEach(function (field) { originalValues[field] = modifications[field]; });
        modifications = {};
        themeModifications = {};
        updateToolbarCount();
        setTimeout(function () { deactivateEditMode(); }, 2000);
        return;
      }

      var filePath = filePaths[index];
      var ops = fileGroups[filePath];

      fetch('/api/cms/content?path=' + encodeURIComponent(filePath))
        .then(function (res) {
          if (!res.ok) throw new Error('Impossible de lire ' + filePath);
          return res.json();
        })
        .then(function (data) {
          var content = data.content;
          var sha = data.sha;

          ops.forEach(function (op) {
            if (op.index !== undefined && op.index !== null) {
              // Array item
              if (Array.isArray(content[op.field])) {
                if (op.subfield) {
                  content[op.field][op.index][op.subfield] = op.value;
                } else {
                  content[op.field][op.index] = op.value;
                }
              }
            } else {
              content[op.field] = op.value;
            }
          });

          var fieldNames = ops.map(function (op) { return op.field; }).join(', ');
          return fetch('/api/cms/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              path: filePath, content: content, sha: sha,
              message: '\u00c9dition visuelle : ' + fieldNames,
            }),
          });
        })
        .then(function (saveRes) {
          if (!saveRes.ok) {
            return saveRes.json().then(function (d) { throw new Error(d.error || 'Erreur'); });
          }
          index++;
          processNext();
        })
        .catch(function (err) {
          showToast('Erreur : ' + err.message, 'error');
          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Enregistrer'; }
          if (cancelBtn) cancelBtn.disabled = false;
        });
    }

    processNext();
  }

  // =========================================================
  // TOAST
  // =========================================================

  function showToast(message, type) {
    var existing = document.getElementById('cms-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'cms-toast';
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    var bgColor = type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#475569';

    Object.assign(toast.style, {
      position: 'fixed', top: '24px', right: '24px', zIndex: '10003',
      padding: '12px 20px', background: bgColor, color: '#fff',
      borderRadius: '10px', fontSize: '14px', fontWeight: '500',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      opacity: '0', transform: 'translateY(-10px)', transition: 'all 0.3s ease',
    });

    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(function () { toast.remove(); }, 300);
    }, 4000);
  }

  // =========================================================
  // STYLES INJECTES
  // =========================================================

  function injectStyles() {
    if (document.getElementById('cms-edit-styles')) return;
    var style = document.createElement('style');
    style.id = 'cms-edit-styles';
    document.documentElement.style.setProperty('--cms-accent', cmsConfig.colors.accent);
    style.textContent =
      '.cms-editable{outline:2px dashed transparent;outline-offset:4px;' +
      'transition:outline-color 0.2s ease,background-color 0.2s ease;cursor:text;border-radius:4px}' +
      '.cms-editable:hover{outline-color:color-mix(in srgb,var(--cms-accent) 50%,transparent)}' +
      '.cms-editable-focus{outline-color:var(--cms-accent)!important;outline-style:solid!important;' +
      'background-color:color-mix(in srgb,var(--cms-accent) 8%,transparent)}' +
      '.cms-editable-richtext{min-height:1em}' +
      '.cms-editable-richtext:focus{outline-color:var(--cms-accent)!important;outline-style:solid!important;' +
      'outline-width:2px!important;background-color:color-mix(in srgb,var(--cms-accent) 6%,transparent);' +
      'box-shadow:0 0 0 4px color-mix(in srgb,var(--cms-accent) 10%,transparent)}' +
      'body:has(#cms-toolbar){padding-bottom:64px}' +
      '.cms-image-overlay:hover{opacity:1!important}' +
      '.cms-editable-flash{animation:cms-flash 1.5s ease-out}' +
      '@keyframes cms-flash{0%{outline-color:var(--cms-accent);outline-style:solid}' +
      '100%{outline-color:transparent;outline-style:dashed}}' +
      '.cms-toolbar-icon{display:none}' +
      '@media(max-width:640px){' +
      '.cms-toolbar-label{display:none!important}' +
      '.cms-toolbar-icon{display:inline!important}' +
      '#cms-toolbar{padding:10px 16px!important}' +
      '#cms-toolbar-count{font-size:12px!important}' +
      '#cms-theme-panel{width:100%!important;max-width:100%!important}' +
      '#cms-image-modal>div{width:95vw!important;padding:16px!important}' +
      '}';
    document.head.appendChild(style);
  }

  // --- Go ---
  init();
})();
