gsap.registerPlugin(Draggable, Flip);

class Home {
  constructor() {
    this.selectedSize = { min: 0, max: 0 };
    this.selectedType = ["all"];
    this.selectedColor = "all";
    this.filterElements = {};
    this.raf;
    this.scrollY = 0;
    this.currentScroll = 0;
    this.colors = [];

    this.lastPosition = 0;
    this.lastTime = performance.now();
    this.isScrolling = false;
    this.velocity = 0;
    this.snapThreshold = 0.1; // Seuil de vitesse pour déclencher le snap
    this.markeeScroll = 0;
    this.easeFactor = 0.02;
    this.currentEase = easeOut;

    this.focusCarouselX = 0;
    this.isXPView = true;
    this.isSafari = false;

    this.isSnappingScroll = false;

    this.outsideClickListener = this.outsideClickListener.bind(this);
    this.dragMouseDown = this.dragMouseDown.bind(this);
    this.dragMouseMove = this.dragMouseMove.bind(this);
    this.dragMouseUp = this.dragMouseUp.bind(this);
    this.handleWheelXp = this.handleWheelXpView.bind(this);
    this.handleClickMarkee = this.handleClickMarkeeItem.bind(this);

    this.initDOM();
    this.initFilters();
    this.initViews();
    this.guiVal = {
      throttleInterval: 100,
      scaleTarget: 0.15,
      durationTarget: 0.6,
      threshold: 350,
      verticalGap: 1,
      horizontalGap: 1,
      ratioOut: 1,
    };
    this.isPristine = false;
    this.allItems = [];
    this.removedItems = [];
    this.zoomLevel = 2;
    this.zoomInfos = [
      {
        scale: 0.3,
        dimensions: 335,
        ratioOut: 0.675,
      },
      {
        scale: 0.5,
        dimensions: 200,
        ratioOut: 0.5,
        ratioIn: -0.675,
      },
      {
        scale: 1,
        dimensions: 100,
        ratioIn: -0.5,
      },
    ];

    this.newX = 0;
    this.newY = 0;

    this.setupDraggable();
    this.disableDrag();
    this.initEvents();
    this.resize();
    // this.moveGridInitialPos();
    this.zoomOnInit();
    this.setInfoTitleTop();

    // this.initGUI();

    //GUI
  }

  initDOM() {
    // grid
    // this.grid = document.querySelector(".section_collection");
    this.pageWrapper = document.querySelector(".page-wrapper");
    this.gridWrapper = document.querySelector(".main-wrapper");
    this.xpWrapper = document.createElement("div");
    this.xpWrapper.classList.add("xp-wrapper");
    this.xpSectionCollection = document.createElement("div");
    this.xpSectionCollection.classList.add("xp_section_collection");
    // const clone = document.querySelector(".main-wrapper").cloneNode(true);
    // this.immutableNode = clone.outerHTML;
    this.pageWrapper.classList.toggle("screen-height");
    this.xpWrapper.appendChild(this.xpSectionCollection);
    this.pageWrapper.appendChild(this.xpWrapper);

    // Buttons
    const buttonGroup = document.querySelector(".button-group");
    this.buttonGroup = buttonGroup.cloneNode(true);
    buttonGroup.remove();

    // Items
    this.filteredItems = Array.from(
      document.querySelectorAll(".products-collection_item")
    );
    this.itemsCard = Array.from(
      document.querySelectorAll(".collection_item-card")
    );
    this.first = [];
    this.other = [];

    this.setItemSize();
    // // // console.log(this.initialItemSize);

    // Focus mode
    this.initFocusDOM();

    // this.initLazyImages();

    // this.gap = 60; // Gap between items

    this.reconstructDOM();

    this.toggleCardVisible();
    this.prefixeClasses(true);
    // this.filteredItems = Array.from(document.querySelectorAll('.item'))

    this.itemSize2 = document
      .querySelector(".xp_collection_item-img")
      .getBoundingClientRect().width;
    this.scaleRatio = this.itemSize2 / this.itemSize;

    this.setPaddingFocusWrapper();

    this.handleOverflowHTML();

    if (isSafari()) {
      // document.documentElement.classList.add("safari");
      this.isSafari = true;
      // // console.log(this.isSafari);
    }

    if (isMobileOrTabletOrLand()) {
      document.documentElement.classList.add("tablet");
    }
    if (onlyDesktop()) {
      document.documentElement.classList.add("desktop");
    }

    // Old split text place
  }
  initViews() {
    this.viewButton = document.createElement("button");
    this.viewButton.classList.add("viewButton");

    if (!isMobileOrTabletOrLand()) {
      this.viewButton.classList.add("toGrid");
      this.viewButton.innerHTML = "experience view";
      this.pageWrapper.appendChild(this.viewButton);
    } else {
      // this.viewButton.innerHTML = "grid view";

      this.navbarWrap = document.createElement("div");
      this.navbarWrap.classList.add("navbarWrap");

      const link = this.navbar.querySelectorAll("a")[1];
      this.navbarWrap.appendChild(link);
      this.navbarWrap.appendChild(this.viewButton);
      this.navbar.appendChild(this.navbarWrap);
    }

    this.viewButton.addEventListener("click", this.toggleView.bind(this));

    this.orderedCollections = {};

    this.filteredItems.forEach((el) => {
      const collection = el.getAttribute("data-collection"); // Récupère la collection

      // If it's the first element
      if (!this.orderedCollections[collection]) {
        this.orderedCollections[collection] = [];
        el.classList.add("first");
        this.first.push(el);
      } else {
        el.classList.add("other");
        this.other.push(el);
      }

      this.orderedCollections[collection].push({ el });
    });
    // // // console.log(this.orderedCollections[collection].length);

    //Init product number
    const collectionCard = Array.from(
      document.querySelectorAll(".collection_item-info")
    );
    collectionCard.forEach((card, i) => {
      const name = card.querySelector(".name-collection-card").innerText;
      const numberItem = this.orderedCollections[name].length;
      const numberProducts = card.querySelector(".number-products");
      numberProducts.innerText = numberItem;
    });
    this.prepareSplitText();
    this.prepareButtonsHover();
  }

  initFilters() {
    // Controls and filters
    this.controls = document.createElement("div");
    this.colorFilter = document.createElement("div");
    this.typeFilter = document.createElement("div");
    this.sizeInput = document.createElement("input");
    const colorsList = document.getElementById("colors-list");
    const typesList = document.getElementById("types-list");
    const colors = Array.from(colorsList.querySelectorAll("[data-color]"));
    const types = Array.from(typesList.querySelectorAll("[data-type]"));
    this.isSizeTouched = false;

    // Extraire les valeurs uniques de data-size
    this.sizes = [
      ...new Set(
        [...this.filteredItems].map((item) =>
          parseFloat(item.getAttribute("data-size"))
        )
      ),
    ];
    this.sizes.sort(function (a, b) {
      return a - b;
    });

    this.colors = Object.fromEntries(
      colors.map((el) => [el.dataset.color, el.style.backgroundColor])
    );

    // Buttons
    this.filterButton = document.createElement("button");
    this.filterCTA = document.createElement("button");
    this.filterButton.classList.add("filterButton");
    this.filterCTA.classList.add("filterCTA");
    this.filterButton.innerHTML = "Filter";
    this.filterCTA.innerHTML = "filter";

    const resetBut = document.querySelector(".reset-button");
    const closeBut = document.querySelector(".close-button");
    const backButton = document.querySelector(".back-button");
    const filterCategory = document.querySelector(".filter-category");
    const instructionZoomWrapper = document.querySelector(
      ".instruction-zoom-wrapper"
    );

    // // console.log(backButton);

    this.resetButton = resetBut.cloneNode(true);
    this.resetIcon = resetBut.querySelector("img").cloneNode();
    this.closeButton = closeBut.cloneNode(false);
    this.backButton = backButton.cloneNode(false);
    this.filterCategory = filterCategory.cloneNode(true);
    this.instructionZoomWrapper = instructionZoomWrapper.cloneNode(true);

    // this.buttonDefaultText = this.buttonGroup.querySelector(".menu-button_txt");

    this.hideResetButton();
    this.initNotFound();

    resetBut.remove();
    closeBut.remove();
    backButton.remove();
    filterCategory.remove();
    instructionZoomWrapper.remove();

    this.filterCategoryColor = this.filterCategory.cloneNode(true);
    this.filterCategoryType = this.filterCategory.cloneNode(true);
    this.filterCategorySize = this.filterCategory.cloneNode(true);

    this.colorButton = document.createElement("button");
    this.typeButton = document.createElement("button");
    this.sizeButton = document.createElement("button");

    this.filterCategoryColor.appendChild(this.colorButton);
    this.filterCategoryType.appendChild(this.typeButton);
    this.filterCategorySize.appendChild(this.sizeButton);

    this.colorButton.innerText = "color";
    this.typeButton.innerText = "type";
    this.sizeButton.innerText = "⌀ size";

    this.allFilters = [
      this.filterCategoryColor,
      this.filterCategoryType,
      this.filterCategorySize,
    ];

    this.allFilters.forEach((filter) => {
      const but = filter.querySelector("button");
      const plus = document.createElement("span");
      plus.classList.add("plus");
      plus.innerText = "+";

      const pipe = document.createElement("span");
      pipe.classList.add("pipe");
      pipe.innerText = "|";

      but.appendChild(plus);
      but.appendChild(pipe);
    });

    // Range

    this.createInputRange();

    this.controls.classList.add("controls");
    this.colorFilter.classList.add("colorFilter");
    this.typeFilter.classList.add("typeFilter");
    this.colorFilter.id = "colorFilter";
    this.typeFilter.id = "typeFilter";

    this.createSelect(this.colorFilter, colors, "color");
    this.createSelect(this.typeFilter, types, "type");

    // Filter elements

    this.filterElementWrapper = document.createElement("div");
    this.filterElementWrapper.classList.add("filterElementWrapper");

    // this.createFilterElement("size");

    this.controls.appendChild(this.filterElementWrapper);
    this.controls.appendChild(this.closeButton);
    this.controls.appendChild(this.filterCategoryColor);
    this.controls.appendChild(this.filterCategoryType);
    this.controls.appendChild(this.filterCategorySize);

    if (isMobileOrTabletOrLand()) {
      this.filtersMobile = document.createElement("div");
      this.closeFilters = document.createElement("button");
      this.filtersMobile.classList.add("filtersMobile");
      this.closeFilters.classList.add("closeFilters");
      this.closeFilters.appendChild(this.backButton);
      this.filtersMobile.appendChild(this.colorFilter);
      this.filtersMobile.appendChild(this.typeFilter);
      this.filtersMobile.appendChild(this.sizeInputRange);
      this.filtersMobile.appendChild(this.closeFilters);

      this.pageWrapper.appendChild(this.filtersMobile);

      this.closeFilters.addEventListener(
        "click",
        this.handleCloseFilters.bind(this)
      );
    } else {
      this.filterCategoryColor.appendChild(this.colorFilter);
      this.filterCategoryType.appendChild(this.typeFilter);
      this.filterCategorySize.appendChild(this.sizeInputRange);
    }

    this.pageWrapper.appendChild(this.filterCTA);
    // this.controls.appendChild(this.filterButton);
    if (isMobileOrTabletOrLand())
      this.filterElementWrapper.appendChild(this.resetButton);
    else this.controls.appendChild(this.resetButton);
    this.pageWrapper.appendChild(this.controls);
    if (!isMobileOrTabletOrLand()) {
      this.pageWrapper.appendChild(this.instructionZoomWrapper);
    }

    colorsList.remove();
    typesList.remove();
  }
  initWidthFilters() {
    this.controls.classList.add("flex");
    this.allFilters.forEach((filter) => {
      filter.classList.add("open");
      const gap = 5;
      const button = filter.children[1];
      const fullWidth = filter.getBoundingClientRect().width;
      const filterWidth = button.getBoundingClientRect().width;
      const buttonWidth = Math.round(fullWidth - filterWidth + gap);
      filter.setAttribute("data-full-width", fullWidth);
      filter.setAttribute("data-button-width", buttonWidth);
      filter.style.width = `${buttonWidth}px`;
      filter.classList.remove("open");
    });
    this.controls.classList.remove("flex");
  }

  initLazyImages(images) {
    // Sélectionne toutes les images avec la classe "lazy-image"

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // console.log(entry.isIntersecting);
          gsap.to(entry.target, {
            scale: 1,
            ease: "back.out",
            duration: 0.5,
            delay: 0.25,
            // stagger: 0.02,
          });
          observer.unobserve(entry.target); // Stop observer une fois chargé
        }
      });
    });

    // Initialisez toutes les images avec opacity 0
    images.forEach((img) => {
      // entry.target.style.transform = "scale3d(0, 0, 0)";
      observer.observe(img);
    });
  }

  initNotFound() {
    this.notFound = document.createElement("div");
    this.notFound.classList.add("not_found");
    const dashed = document.createElement("div");
    dashed.classList.add("dashed");
    const resetButton = document.createElement("button");
    const resetIcon = document.createElement("div");
    const resetText = document.createElement("p");
    const text = document.createElement("p");
    resetIcon.classList.add("resetIcon");
    text.classList.add("no_product");
    resetIcon.classList.add("resetIcon");
    resetText.innerText = "reset filter";
    text.innerText = "No products found..";

    dashed.addEventListener("click", this.handleReset.bind(this));
    // // console.log(this.resetIcon);
    resetIcon.appendChild(this.resetIcon);
    resetButton.appendChild(resetIcon);
    resetButton.appendChild(resetText);
    dashed.appendChild(resetButton);
    this.notFound.appendChild(text);
    this.notFound.appendChild(dashed);
    this.pageWrapper.appendChild(this.notFound);
  }

  initFocusDOM() {
    this.focusWrapper = document.createElement("div");
    this.focusWrapper.classList.add("focusWrapper");
    this.pageWrapper.appendChild(this.focusWrapper);

    this.focusCarousel = document.createElement("div");
    this.focusCarousel.classList.add("focusCarousel");
    this.focusWrapper.appendChild(this.focusCarousel);

    this.focusInfos = document.createElement("div");
    this.focusInfos.classList.add("focusInfos");
    this.focusWrapper.appendChild(this.focusInfos);

    this.navbar = document.querySelector(".navbar");
    this.buttonCloseFocus = document.createElement("button");
    this.buttonCloseFocus.classList.add("buttonCloseFocus");
    if (!isMobileOrTabletOrLand())
      this.focusWrapper.appendChild(this.buttonCloseFocus);
    else {
      this.navbar.appendChild(this.buttonCloseFocus);
      this.buttonCloseFocus.classList.add("none");
    }

    this.focusedCollectionTitle = document.createElement("h2");
    this.focusedCollectionTitle.classList.add(
      "focusedCollectionTitle",
      "heading-style-160px"
    );
    this.focusInfos.appendChild(this.focusedCollectionTitle);

    this.contextualInfo = document.createElement("p");
    this.contextualInfo.classList.add(
      "contextualInfo",
      "text-size-18px"
      // "heading-style-160px"
    );
    this.focusWrapper.appendChild(this.contextualInfo);

    this.focusCTAs = document.createElement("div");
    this.focusCTAs.classList.add("focusCTAs");
    this.initMarkee();
    if (isMobileOrTabletOrLand()) {
      this.focusWrapper.appendChild(this.focusCTAs);
    } else {
      this.focusWrapper.appendChild(this.focusCTAs);
    }

    // this.buyProduct = document.createElement("button");
    // this.buyProduct.classList.add("buyProduct");
    // this.buyProduct.innerText = "buy product";
    // this.focusCTAs.appendChild(this.buyProduct);

    // this.exploreCollection = document.createElement("button");
    // this.exploreCollection.classList.add("exploreCollection");
    // this.exploreCollection.innerText = "explore collection";
    // this.focusCTAs.appendChild(this.exploreCollection);
    this.initExploreButtons();
    this.focusCTAs.appendChild(this.buttonGroup);
  }

  initExploreButtons() {
    this.exploreButtons = document.querySelectorAll(".explore-button");
    this.exploreButtons.forEach((button) => {
      const slug = button.getAttribute("data-button-collection-name");
      const link = this.createCollectionHref(slug);
      button.href = link;
    });
  }
  initMarkee() {
    this.focusMarkeeWrapper = document.createElement("div");
    this.focusMarkeeWrapper.classList.add("focusMarkeeWrapper");
    this.focusWrapper.appendChild(this.focusMarkeeWrapper);

    this.focusMarkee = document.createElement("div");
    this.focusMarkee.classList.add("focusMarkee");
    this.focusMarkeeWrapper.appendChild(this.focusMarkee);

    this.focusMarkeeIndicator = document.createElement("div");
    this.focusMarkeeIndicator.classList.add("focusMarkeeIndicator");
    this.focusMarkeeWrapper.appendChild(this.focusMarkeeIndicator);
  }

  createInputRange() {
    this.sizeInputRange = document.createElement("div");
    this.sizeInputRange.classList.add("double_range_slider_box");
    const slider = document.createElement("div");
    slider.classList.add("double_range_slider");
    this.range = document.createElement("span");
    this.range.classList.add("range_track");
    // const sizeValues = document.createElement("div");
    // sizeValues.classList.add("sizeValues");

    const input1 = document.createElement("input");
    const input2 = document.createElement("input");

    input1.type = "range";
    input1.value = "0";
    input1.min = "0";
    input1.max = this.sizes.length;
    input1.step = "0";
    input1.id = "sizeInputMin";
    input1.classList.add("min");

    input2.type = "range";
    input2.value = this.sizes[this.sizes.length - 1];
    input2.min = "0";
    input2.max = this.sizes.length;
    input2.step = "0";
    input2.id = "sizeInputMax";
    input2.classList.add("max");

    this.label1 = document.createElement("label");
    this.label2 = document.createElement("label");

    this.label1.id = "sizeInputMin";
    this.label2.id = "sizeInputMax";

    this.minval = document.createElement("div");
    this.maxval = document.createElement("div");
    this.minval.classList.add("minvalue");
    this.maxval.classList.add("maxvalue");

    slider.appendChild(this.range);
    slider.appendChild(input1);
    slider.appendChild(this.label1);
    slider.appendChild(input2);
    slider.appendChild(this.label2);

    this.sizeInputRange.appendChild(this.minval);
    this.sizeInputRange.appendChild(slider);
    this.sizeInputRange.appendChild(this.maxval);
    this.minRangeValueGap = 1;
    this.rangeInput = [input1, input2];

    // this.minRange;
    // this.maxRange;

    this.selectedSize.min = this.sizes[0];
    this.selectedSize.max = this.sizes[this.sizes.length - 1];
    // // console.log(this.selectedSize.max);

    this.setMinValueOutput();
    this.setMaxValueOutput();
    this.minRangeFill();
    this.maxRangeFill();
    // MinVlaueBubbleStyle();
    // MaxVlaueBubbleStyle();

    this.rangeInput.forEach((input) => {
      input.addEventListener("input", this.handleRangeChange.bind(this));
    });
  }

  handleRangeChange(e) {
    this.isSizeTouched = true;

    this.setMinValueOutput();
    this.setMaxValueOutput();

    this.minRangeFill();
    this.maxRangeFill();

    this.selectedSize.min = this.sizes[this.rangeInput[0].value];
    this.selectedSize.max = this.sizes[this.rangeInput[1].value - 1];

    if (this.maxRange - this.minRange < this.minRangeValueGap) {
      if (e.target.className === "min") {
        this.rangeInput[0].value = this.maxRange - this.minRangeValueGap;
        this.setMinValueOutput();
        this.minRangeFill();
        e.target.style.zIndex = "2";
      } else {
        this.rangeInput[1].value = this.minRange + this.minRangeValueGap;
        e.target.style.zIndex = "2";
        this.setMaxValueOutput();
        this.maxRangeFill();
      }
    }
    // // console.log("filter");

    this.handleRangeChangeFilterDebounce(e);
  }

  handleRangeChangeFilterDebounce = debounce((e) => {
    this.removeMouseMoveListener();
    this.handleRangeChangeFilter(e); // Appel de la fonction avec l'index
  }, 1000);

  handleRangeChangeFilter(e) {
    if (this.isSizeTouched)
      this.createFilterSizeElement("size", this.selectedSize);
    this.handleFiltering(e);
    // this.checkIfAnyFilterIsApplied();
  }

  minRangeFill = () => {
    this.range.style.left =
      (this.rangeInput[0].value / (this.sizes.length - 1)) * 100 + "%";
  };
  maxRangeFill = () => {
    this.range.style.right =
      100 - (this.rangeInput[1].value / this.sizes.length) * 100 + "%";
  };

  setMinValueOutput = () => {
    this.minRange = parseInt(this.rangeInput[0].value);
    this.minval.innerHTML = `⌀ ${this.sizes[this.rangeInput[0].value]} cm`;
  };
  setMaxValueOutput = () => {
    this.maxRange = parseInt(this.rangeInput[1].value);
    this.maxval.innerHTML = `⌀ ${this.sizes[this.rangeInput[1].value - 1]} cm`;
  };

  createSelect(select, array, data) {
    // colors
    array.forEach((el, i) => {
      const opt = document.createElement("div");
      opt.classList.add("option");
      opt.setAttribute("data-value", el.dataset[data]);
      select.appendChild(opt);
      if (data === "type") {
        opt.addEventListener("click", this.handleClickType.bind(this));
        opt.innerHTML = el.dataset[data];
      } else if (data === "color") {
        // // console.log(el.style.backgroundColor);
        opt.style.backgroundColor = el.style.backgroundColor;
        opt.addEventListener("click", this.handleClickColor.bind(this));
      }
    });
  }

  handleClickType(e) {
    const value = e.srcElement.dataset.value;
    if (this.selectedType.includes(value)) {
      e.srcElement.classList.remove("selected");
      this.removeFilterElement(e, "type", "selected", value);
      // this.selectedType.splice(this.selectedType.indexOf(value), 1); //deleting
      // if (this.selectedType.length === 0) this.selectedType.push("all");
    } else {
      if (this.selectedType.includes("all")) this.selectedType = [];
      e.srcElement.classList.add("selected");
      this.selectedType.push(value);
      this.createFilterElement("type", value);
    }
    this.handleFilteringDebounce(e);
    // // console.log(this.selectedType);
  }

  handleClickColor(e) {
    const value = e.srcElement.dataset.value;
    if (this.selectedColor.includes(value)) {
      e.srcElement.classList.remove("selected");
      this.removeFilterElement(e, "color", "selected", value);
      // this.selectedType.splice(this.selectedType.indexOf(value), 1); //deleting
      // if (this.selectedType.length === 0) this.selectedType.push("all");
    } else {
      if (this.selectedColor.includes("all")) this.selectedColor = [];
      e.srcElement.classList.add("selected");
      this.selectedColor.push(value);
      this.createFilterElement("color", value);
    }
    this.handleFilteringDebounce(e);
    // // console.log(this.selectedColor);
  }
  // Old handle with 1 element only
  // handleClickType(e) {
  //   const value = e.srcElement.dataset.value;
  //   if (this.selectedType === value) {
  //     this.selectedType = "all";
  //     e.srcElement.classList.remove("selected");
  //     this.removeFilterElement(e, "type", );
  //   } else {
  //     if (this.selectedTypeElement)
  //       this.selectedTypeElement.classList.remove("selected");
  //     this.selectedType = value;
  //     e.srcElement.classList.add("selected");
  //     this.selectedType = value;
  //     this.selectedTypeElement = e.srcElement;
  //     this.addFilterElement("type", value);
  //   }
  //   this.handleFilteringDebounce(e);
  // }

  // handleClickColor(e) {
  //   const value = e.srcElement.dataset.value;
  //   if (this.selectedColor === value) {
  //     this.selectedColor = "all";
  //     e.srcElement.classList.remove("selected");
  //     this.removeFilterElement(e, "color", "selected", value);
  //   } else {
  //     if (this.selectedColorElement)
  //       this.selectedColorElement.classList.remove("selected");
  //     this.selectedColor = value;
  //     e.srcElement.classList.add("selected");
  //     this.selectedColor = value;
  //     this.selectedColorElement = e.srcElement;
  //     // this.addFilterElement("color", value);
  //   }
  //   this.handleFilteringDebounce(e);
  // }

  createFilterElement(cate, value) {
    // this.filterElements[cate] = {};

    // this.filterElements[cate].parent.classList.remove("none");

    const element = document.createElement("div");
    element.classList.add("filterElement");
    element.setAttribute("data-for", value);

    const text = document.createElement("div");
    // text.classList.add("filterElement");
    text.innerText = cate;

    const remove = document.createElement("button");
    remove.classList.add("filterElementRemove");

    element.appendChild(text);

    this.animAddFilter(element);

    if (cate === "type") {
      // this.selectedTypeElement.push(value);
      text.textContent = value;
    }

    if (cate === "color") {
      const colorIndic = document.createElement("span");
      colorIndic.classList.add("colorIndic");
      element.appendChild(colorIndic);
      element.color = colorIndic;

      text.textContent = value;
      element.color.style.backgroundColor = this.colors[value];
    }

    if (cate === "size") {
      text.textContent = `${value.min} - ${value.max} cm`;
    }

    element.appendChild(remove);

    if (this.filterElementWrapper.contains(this.resetButton)) {
      this.filterElementWrapper.insertBefore(element, this.resetButton);
    } else {
      this.filterElementWrapper.appendChild(element);
    }

    remove.addEventListener("click", (e) =>
      this.removeFilterElement(e, cate, "filter", value)
    );
    // this.filterElements[cate].parent = element;
    element.text = text;
  }
  createFilterSizeElement(cate, value) {
    const filterSizeText = document.querySelector(".filterSize .text");
    if (filterSizeText)
      filterSizeText.textContent = `${value.min} - ${value.max} cm`;
    else {
      const element = document.createElement("div");
      element.classList.add("filterElement", "filterSize");
      element.setAttribute("data-for", value);

      const text = document.createElement("div");
      text.classList.add("text");
      text.innerText = `${value.min} - ${value.max} cm`;

      const remove = document.createElement("button");
      remove.classList.add("filterElementRemove");

      element.appendChild(text);

      element.appendChild(remove);
      if (this.filterElementWrapper.contains(this.resetButton)) {
        this.filterElementWrapper.insertBefore(element, this.resetButton);
      } else {
        this.filterElementWrapper.appendChild(element);
      }

      this.animAddFilter(element);

      remove.addEventListener("click", (e) =>
        this.removeFilterElement(e, cate, "filter", value)
      );
    }
    // this.filterElements[cate].parent.classList.remove("none");
    // if (cate === "size") {
    //   this.filterElements[
    //     cate
    //   ].text.textContent = `${value.min} - ${value.max} cm`;
    // }
  }

  removeFilterElement(e, cate, from, value) {
    // // console.log(value);
    if (cate === "size") {
      this.updateSelectedSize(e);
    } else {
      if (from === "filter") this.findSelectedFromFilter(e, value, cate);
      if (from === "selected") this.findFilterFromSelected(e, value);
      if (cate === "type") this.updateSelectedType(value);
      else if (cate === "color") this.updateSelectedColor(value);
    }

    // // console.log(this.selectedType);
    // this.filterElements[cate].parent.classList.add("none");
    this.handleFilteringDebounce(e);
    this.checkIfAnyFilterIsApplied();
  }

  findSelectedFromFilter(e, value, cate) {
    const currentFilter = cate === "type" ? this.typeFilter : this.colorFilter;
    const allSelected = Array.from(currentFilter.querySelectorAll(".selected"));
    const elToUnselect = allSelected.find(
      (f) => f.getAttribute("data-value") === value
    );
    elToUnselect.classList.remove("selected");
    this.animRemoveFilter(e.target.parentNode);
  }
  findFilterFromSelected(e, value) {
    const filters = Array.from(this.filterElementWrapper.children);
    const elToUnselect = filters.find(
      (f) => f.getAttribute("data-for") === value
    );
    // // console.log(filters, elToUnselect);
    this.animRemoveFilter(elToUnselect);
  }
  updateSelectedType(value) {
    this.selectedType.splice(this.selectedType.indexOf(value), 1);
    if (this.selectedType.length === 0) this.selectedType = "all";
  }
  updateSelectedColor(value) {
    this.selectedColor.splice(this.selectedColor.indexOf(value), 1);
    if (this.selectedColor.length === 0) this.selectedColor = "all";
  }

  updateSelectedSize(e) {
    this.rangeInput[0].value = 0;
    this.rangeInput[1].value = this.sizes.length;
    this.handleRangeChange(e);
    this.isSizeTouched = false;

    // remove item
    const filterSize = document.querySelector(".filterSize");
    this.animRemoveFilter(filterSize);
  }

  animAddFilter(el) {
    // const newWidth = this.filterElementWrapper.getBoundingClientRect().width;
    // // console.log(newWidth);
    // this.filterElementWrapper.style.width = `${newWidth}`;
    gsap.fromTo(
      el,
      { yPercent: 100, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        ease: "back.out",
        duration: 0.5,
        // onComplete: () => element.classList.add("ease"),
      }
    );
  }

  animRemoveFilter(el) {
    const tl = gsap.timeline({
      onComplete: () => {
        if (el.length) {
          el.forEach((e) => e.remove());
        } else el.remove();
      },
    });
    tl.fromTo(
      el,
      { yPercent: 0, opacity: 1 },
      {
        yPercent: 100,
        opacity: 0,
        ease: "back.in",
        duration: 0.5,
        stagger: 0.05,
        // onComplete: () => element.classList.add("ease"),
      }
    );
  }

  checkIfAnyFilterIsApplied() {
    // // console.log("check");
    if (document.querySelector(".selected") || this.isSizeTouched)
      this.showResetButton();
    else this.hideResetButton();
  }
  checkNeedsFiltering(e) {
    if (this.needsFiltering) {
      this.handleFiltering(e);
      this.needsFiltering = false;
    } else {
      this.addMouseMoveListener();
    }
  }

  initEvents() {
    this.colorButton.addEventListener("click", (e) =>
      this.clickOnFilter(e, "color", this.filterCategoryColor)
    );
    this.typeButton.addEventListener("click", (e) =>
      this.clickOnFilter(e, "type", this.filterCategoryType)
    );
    this.sizeButton.addEventListener("click", (e) =>
      this.clickOnFilter(e, "size", this.filterCategorySize)
    );

    this.filterCTA.addEventListener("click", this.openControls.bind(this));
    this.closeButton.addEventListener("click", this.closeControls.bind(this));

    this.drag.addEventListener("dragstart", this.hideDragForMore);
    this.xpSectionCollection.addEventListener("wheel", this.hideDragForMore);

    // this.filterButton.addEventListener(
    //   "click",
    //   this.handleFiltering.bind(this)
    // );
    this.buttonCloseFocus.addEventListener("click", this.closeFocus.bind(this));
    this.resetButton.addEventListener("click", this.handleReset.bind(this));
    // Throttle mousemove event
    if (!isMobileOrTabletOrLand()) {
      this.throttledMouseMove = throttle(
        this.updateScales.bind(this),
        this.guiVal.throttleInterval
      ); // 50ms interval
      this.addMouseMoveListener();

      this.addEventsZoom();
    }
  }
  hideDragForMore(e) {
    const dragEl = document.querySelector(".dragformorewrapper");
    if (dragEl) dragEl.classList.add("opacity-0");
    // this.drag.addEventListener("dragstart", this.hideDragForMore);
  }

  setItemSize() {
    const img = document.querySelector(".collection_item-img");
    if (img) this.itemSize = img.getBoundingClientRect().width;
    // Need resize update

    const item = document.querySelector(".products-collection_item");
    if (item) this.initialItemSize = item.getBoundingClientRect().width;
  }

  openControls() {
    this.controls.classList.add("flex");

    const tl = gsap.timeline();
    tl.to(this.filterCTA, { opacity: 0, duration: 0.3 });
    tl.fromTo(
      [".filterElement", this.allFilters, ".reset-button", ".close-button"],
      {
        yPercent: 500,
      },
      {
        yPercent: 0,
        stagger: {
          amount: 0.06,
          from: "start",
        },
        ease: "back.out",
        onComplete: () => {
          this.allFilters.forEach((f) =>
            f.classList.add("filter-category-easing")
          ),
            this.filterCTA.classList.add("none");
        },
      }
    );
  }
  closeControls() {
    this.allFilters.forEach((f) =>
      f.classList.remove("filter-category-easing")
    );
    const tl = gsap.timeline();

    tl.fromTo(
      [".filterElement", this.allFilters, ".reset-button", ".close-button"],
      {
        yPercent: 0,
      },
      {
        yPercent: 300,
        stagger: {
          amount: 0.025,
          from: "end",
        },
        ease: "back.in",
        onComplete: () => {
          this.controls.classList.remove("flex");
          this.filterCTA.classList.remove("none");
        },
      }
    );
    tl.to(this.filterCTA, { opacity: 1, duration: 0.3 });
  }

  clickOnFilter = (e, name, parent) => {
    const currentFilter = e.target.parentNode;
    // // console.log(currentFilter);
    if (isMobileOrTabletOrLand()) {
      this.controls.classList.add("hidden");
      this.filtersMobile.classList.add("flex");
      if (currentFilter.classList.contains("flex")) {
        currentFilter.classList.remove("flex");
        return;
      }

      if (name === "color") {
        this.colorFilter.classList.add("flex");
        this.currentMobileFilter = this.colorFilter;
      } else if (name === "type") {
        this.typeFilter.classList.add("flex");
        this.currentMobileFilter = this.typeFilter;
      } else if (name === "size") {
        this.sizeInputRange.classList.add("flex");
        this.currentMobileFilter = this.sizeInputRange;
      }

      // if (this.currentMobileFilter) {
      //   this.currentMobileFilter.classList.remove("open");
      // }

      // if (this.currentMobileFilter !== parent)
      //   this.currentMobileFilter = parent;
      // else this.currentMobileFilter = undefined;
      // desktop logic
    } else {
      // // console.log(parent);
      // var filterCate = e.target.parentNode;
      if (parent.classList.contains("open")) {
        this.removeOpenFilter(parent);

        const buttonWidth =
          e.target.parentNode.getAttribute("data-button-width");

        currentFilter.style.width = `${buttonWidth}px`;
      } else {
        const fullWidth = e.target.parentNode.getAttribute("data-full-width");

        currentFilter.style.width = `${fullWidth}px`;
        parent.classList.add("open");
      }
    }
  };

  removeOpenFilter(parent) {
    const tl = gsap.timeline();
    tl.add(() => parent.classList.remove("open"), 0);
  }

  handleCloseFilters() {
    this.controls.classList.remove("hidden");
    this.currentMobileFilter.classList.remove("flex");
    this.filtersMobile.classList.remove("flex");
  }

  // DRAGGABLE

  moveGridInitialPos() {
    this.xpSectionCollection.classList.remove("drag-easing");
    gsap.set(".xp_section_collection", {
      x:
        (this.xpWrapper.offsetWidth - this.xpSectionCollection.offsetWidth) / 2, // Décalage initial de 750px vers la gauche
      y:
        (this.xpWrapper.offsetHeight - this.xpSectionCollection.offsetHeight) /
          2 -
        50, // Aucun décalage vertical
      onComplete: () => {
        setTimeout(() => {
          this.xpSectionCollection.classList.add("drag-easing");
        }, 100);
      },
    });
  }
  moveGridLeft() {
    gsap.set(".xp_section_collection", {
      x:
        (this.xpWrapper.offsetWidth * 2 -
          this.xpSectionCollection.offsetWidth) /
        2, // Décalage initial de 750px vers la gauche
      y:
        (this.xpWrapper.offsetHeight * 2 -
          this.xpSectionCollection.offsetHeight) /
          2 -
        50, // Aucun décalage vertical
    });
  }

  // GSAP Draggable with dynamic bounds
  setupDraggable() {
    // // console.log("setup drag", this.itemHeight);
    this.drag = Draggable.create(".xp_section_collection", {
      type: "x,y",
      allowEventDefault: true,
      inertia: true,
      // maxDuration: 0.
      throwResistance: isMobileOrTabletOrLand() ? 1000 : 8000,
      bounds: {
        minX:
          this.xpWrapper.offsetWidth -
          this.xpSectionCollection.offsetWidth +
          50,
        maxX: -window.innerWidth / 10,
        minY:
          this.xpWrapper.offsetHeight -
          this.xpSectionCollection.offsetHeight +
          -window.innerWidth / 10,
        maxY: isMobileOrTabletOrLand() ? 0 : -window.innerWidth / 10,
      },
      edgeResistance: 0.9,

      onDrag: () => {
        this.setScrollViewBasedOnDrag();
      },
      onThrowUpdate: () => {
        this.setScrollViewBasedOnDrag();
      },
    })[0];

    // // console.log("disable 1");

    this.scrollDelta = { x: 0, y: 0 };
    this.setX = gsap.quickSetter(this.drag.target, "x", "px");
    this.setY = gsap.quickSetter(this.drag.target, "y", "px");
    this.bounds = this.drag.vars.bounds;
  }

  updatePosition = () => {
    // Calcul de la nouvelle position en une seule fois
    // console.log(this.drag.x);
    let newX = this.drag.x - this.scrollDelta.x;
    let newY = this.drag.y - this.scrollDelta.y;
    // Appliquer les bounds
    newX = Math.min(this.bounds.maxX, Math.max(newX, this.bounds.minX));
    newY = Math.min(this.bounds.maxY, Math.max(newY, this.bounds.minY));

    // // console.log(this.newX, newX);
    this.newX = lerpWithEase(this.newX, newX, 0.8, easeQuadOut);
    this.newY = lerpWithEase(this.newY, newY, 0.8, easeQuadOut);

    // Appliquer la nouvelle position
    this.setX(this.newX);
    this.setY(this.newY);

    // Mettre à jour Draggable
    this.drag.update();

    // Reset du scroll
    this.scrollDelta.x = 0;
    this.scrollDelta.y = 0;
  };

  handleWheelXpView(e) {
    e.preventDefault(); // Bloque le scroll natif

    this.scrollDelta.x += e.deltaX;
    this.scrollDelta.y += e.deltaY;

    // Lance l'update à la prochaine frame si ce n'est pas déjà en cours
    requestAnimationFrame(this.updatePosition.bind(this));
  }

  resetDraggable() {
    const boundX =
      this.xpWrapper.offsetWidth - this.xpSectionCollection.offsetWidth + 50;
    const boundY =
      this.xpWrapper.offsetHeight -
      this.xpSectionCollection.offsetHeight -
      window.innerWidth / 10;
    // console.log(boundX, boundY);

    // console.log(this.xpSectionCollection.classList, "remove");
    // Update draggable bounds
    // console.log(this.drag);
    this.drag?.applyBounds({
      minX: boundX,
      maxX: -window.innerWidth / 10,
      minY: boundY,
      maxY: isMobileOrTabletOrLand() ? 0 : -window.innerWidth / 10,
    });

    setTimeout(() => {
      // console.log("remove");

      this.xpSectionCollection.classList.add("drag-easing");
      this.bounds = this.drag.vars.bounds;
    }, 550);
  }

  enableDrag() {
    // console.log("enable");
    this.drag.enable();
    if (isMobileOrTabletOrLand())
      this.xpSectionCollection.classList.remove("disablePointerEvents");
  }
  disableDrag() {
    // console.log("disable");
    this.drag.disable();
    if (isMobileOrTabletOrLand())
      this.xpSectionCollection.classList.add("disablePointerEvents");
  }

  // FLIP

  // Animate changes
  flipOnFilter(state) {
    Flip.from(state, {
      duration: 0.8,
      ease: "cubic.inOut",
      stagger: 0.02,
      onComplete: () => {},
    });
  }
  // Animate changes
  flipOnFocus(state) {
    // const el = Array.from(document.querySelectorAll(".split-parent"));
    // el.forEach((e) => {
    //   e.classList.add("force-repaint");
    //   setTimeout(() => e.classList.remove("force-repaint"), 10);
    //   // console.log(e);
    // });
    Flip.from(state, {
      duration: 1.2,
      absolute: false,
      scale: true,
      zIndex: 10000,
      ease: "power4.inOut",
      onComplete: () => {
        // if (this.H1split && isSafari()) {
        //   this.H1split.revert();
        //   this.Psplit.revert();
        //   requestAnimationFrame(() => this.prepareSplitTextGrid());
        // }
        if (this.focusedCollectionTitleSplit) {
          // console.log(this.focusedCollectionTitleSplit);
          // setTimeout(() => this.focusedCollectionTitleSplit.revert(), 400);
        }
      },
    });
  }

  // Animate changes
  flipToGrid(state) {
    //now animate each character into place from 100px above, fading in:
    // Flip.from(state, {
    //   duration: 0,
    //   ease: "cubic.inOut",
    // absolute: true,
    // onComplete: () => {
    // Make UI appear here
    this.toggleCardVisible();
    // // console.log(this.allItems);
    gsap.to(this.allItems, {
      // scale: 1,
      display: "flex",
      duration: 0,
    });
    gsap.to(this.other, {
      scale: 1,
      delay: 1,
      duration: 0,
    });
    this.firstTrigger = ScrollTrigger.batch(this.first, {
      onEnter: (batch) => {
        // batch
        // // console.log(batch);
        gsap.to(batch, {
          scale: 1,
          stagger: 0.1,
          delay: 0.1,
          duration: 0.8,
          ease: "back.out",
        });
      },
    });
    this.cardScrollTrigger = ScrollTrigger.batch(this.cardTarget, {
      onEnter: (batch) => {
        // // console.log("enter");
        gsap.to(batch, {
          borderColor: `${this.cardTargetColor}`,
          stagger: 0.3,
          delay: 0.5,
          duration: 1,
        });
      },
    });

    if (isMobileOrTabletOrLand())
      gsap.to(".collection_item-indicator", {
        opacity: 1,
        duration: 1,
        delay: 1,
      });

    // requestAnimationFrame(() => {
    //   target.style.whiteSpace = "nowrap"; // Remet la valeur par défaut
    // });
    this.H1split.play(0);
    this.Psplit.play(0);
    this.createDragCard();
    this.enableViewButton();
    // },
    // });
  }
  // Animate changes
  flipToXp(state) {
    // Flip.from(state, {
    //   duration: 1,
    //   ease: "cubic.inOut",
    //   // absolute: true,
    //   onComplete: () => {
    gsap.to(this.allItems, {
      scale: 1,
      overwrite: true,
      stagger: {
        amount: 0.5,
        from: "random",
      },
      ease: "back.out",
      // stagger: 0.02,
    });

    this.enableDrag();
    this.addMouseMoveListener();
    this.enableViewButton();
    // },
    // });
  }

  showResetButton() {
    // console.log(this.resetButton);
    if (!this.resetButton.classList.contains("none")) return;
    gsap.from(this.resetButton, {
      yPercent: 100,
      opacity: 0,
      ease: "back.out",
      duration: 0.5,
      onStart: () => this.resetButton.classList.remove("none"),
    });
  }

  hideResetButton() {
    gsap.to(this.resetButton, {
      yPercent: 0,
      opacity: 1,
      ease: "back.out",
      duration: 0.5,
      onComplete: () => this.resetButton.classList.add("none"),
    });
  }

  // FILTERS

  handleReset(e) {
    this.isSizeTouched = false;
    // e.preventDefault()
    Array.from(document.querySelectorAll(".option")).forEach((op) => {
      op.classList.remove("selected");
    });
    this.selectedColor = "all";
    this.selectedType = ["all"];
    this.rangeInput[0].value = 0;
    this.rangeInput[1].value = this.sizes.length;

    // be careful it'l cost twice loading
    this.handleRangeChange(e);
    this.isSizeTouched = false;

    this.handleResetFilterState();

    // this.handleFilteringDebounce(e);
    this.hideNotFound();
    this.hideResetButton();
  }

  handleFiltering(e) {
    // console.log(this.isFiltering);
    e.preventDefault();
    if (this.isFiltering) {
      this.needsFiltering = true;
      return;
    } else this.isFiltering = true;
    // console.log("filtering");
    this.checkIfAnyFilterIsApplied();
    // this.selectedColor = this.colorFilter.value;
    // this.selectedType = this.typeFilter.value;

    // Maybe not each time ?
    this.hideNotFound();
    this.allItems = this.filteredItems.concat(this.removedItems);

    // // console.log(this.allItems);

    // Capture state before filtering

    this.sort().then(
      () => {
        // console.log("start anim");

        gsap.killTweensOf(this.allItems);
        gsap.to(this.allItems, {
          scale: 0,
          stagger: 0.01,
          overwrite: true,
          // duration: 3,
          ease: "back.in",
          onComplete: () => {
            this.handleSort(e);
            if (this.filteredItems.length === 0) this.showNotFound();
          },
        });
        // // console.log(this.filteredItems.length);
      },
      (error) => {
        /* code if some error */
      }
    );

    // Update grid size after filtering
  }

  handleSort(e) {
    this.animateDomUpdate(e);
    this.moveGridInitialPos();
  }

  handleFilteringDebounce = debounce((e) => {
    // // console.log("handleSort");
    // this.needsFiltering = true;
    this.removeMouseMoveListener();
    this.handleFiltering(e); // Appel de la fonction avec l'index
  }, 100);

  handleResetFilterState() {
    this.animRemoveFilter(
      Array.from(document.querySelectorAll(".filterElement, .reset-button"))
    );
    // Array.from(document.querySelectorAll(".filterElement")).forEach((f) =>
    //   f.remove()
    // );
    // Object.entries(this.filterElements).forEach(([key, value]) => {
    //   this.filterElements[key].parent.classList.add("none");
    // });
    // this.filterElements.forEach((el) => {
    //   el.parent.classList.remove("hidden");
    // });
  }
  calculateGrid() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const viewportRatio = viewportWidth / viewportHeight;
    // Exemple d'utilisation
    let bestCols = 1;
    let bestRows = this.filteredItems.length;
    let bestDiff = Infinity;

    for (let cols = 1; cols <= this.filteredItems.length; cols++) {
      const rows = Math.ceil(this.filteredItems.length / cols);
      const gridRatio = cols / rows;
      const diff = Math.abs(gridRatio - viewportRatio);

      if (diff < bestDiff) {
        bestDiff = diff;
        bestCols = cols;
        bestRows = rows;
      }
    }

    // // console.log(bestCols, bestRows);

    return { cols: bestCols, rows: bestRows };
  }

  async sort() {
    // console.log("should sort once");
    // // console.log(this.isPristine);
    if (this.isPristine) {
      Array.from(
        document.querySelectorAll(".products-collection_item")
      ).forEach((item, i) => {
        const matches = this.itemMatches(item);
        // // console.log(matches);
        if (!matches) {
          this.removedItems.push(item);
          this.filteredItems.splice(i, 1);
        } else {
          this.filteredItems.push(item);
        }
      });
    } else {
      this.filteredItems = this.filteredItems.filter((item) => {
        const matches = this.itemMatches(item);
        if (!matches) {
          this.removedItems.push(item); // Ajouter les éléments non correspondants à `removedItems`
        }
        return matches; // Garder les éléments correspondants
      });
      this.removedItems = this.removedItems.filter((item) => {
        const matches = this.itemMatches(item);
        if (matches) {
          this.filteredItems.push(item); // Ajouter les éléments non correspondants à `removedItems`
        }
        return !matches; // Garder les éléments correspondants
      });
    }
    // // // console.log("filtered ", this.filteredItems);
    // // // console.log("removed ", this.removedItems);
    this.isPristine = false;
    // // console.log("end");
  }

  itemMatches(item) {
    const size = parseFloat(item.dataset.size);

    const matchesColor =
      this.selectedColor === "all" || item.dataset.color === this.selectedColor;
    const matchesType = ["all", item.dataset.type].some((type) =>
      this.selectedType.includes(type)
    );
    // console.log(matchesType);

    const matchesSize =
      !this.isSizeTouched ||
      (this.selectedSize.min <= size && size <= this.selectedSize.max);

    // // console.log(matchesType);
    // // // console.log(matchesSize);
    // // // console.log(matchesColor, matchesType, matchesSize);
    return matchesColor && matchesType && matchesSize;
    // return matchesType; //&& matchesSize;
  }

  animateDomUpdate(e) {
    // this.state = Flip.getState(
    //   ".products-collection_item, .xp_products-collection_item, .column"
    // );

    this.reconstructDOM();
    this.xpSectionCollection = this.newGrid;

    this.resetDraggable(), this.moveGridLeft();

    gsap.to(this.filteredItems, {
      scale: 1,
      stagger: {
        each: 0.02,
        from: "end",
      },
      overwrite: true,
      ease: "back.out",
      onComplete: () => {
        this.isFiltering = false;
        this.checkNeedsFiltering(e);
      },
    });
    // this.flipOnFilter(this.state);
  }

  reconstructDOM() {
    // this.removedItems.forEach(item => item.remove())
    this.newGrid = this.xpSectionCollection;
    this.newGrid.innerHTML = "";

    const columns = [];
    const dimensions = this.calculateGrid();
    // // console.log(`Colonnes: ${dimensions.cols}, Lignes: ${dimensions.rows}`);

    for (let i = 1; i <= dimensions.cols; i++) {
      const column = document.createElement("div");
      column.className = "column";
      columns.push(column);
    }
    var nbTour = 0;
    var add = 0;

    this.filteredItems.forEach((item, i) => {
      if (this.isOdd(nbTour)) add = 0;
      else add = 1;
      // // // console.log(columns, [(i + add) % dimensions.cols])
      columns[i % dimensions.cols].appendChild(item);
      // // console.log(dimensions.cols, (i + add) % dimensions.cols);
      if (i % dimensions.cols === 0) nbTour++;
    });

    columns.forEach((col) => this.newGrid.appendChild(col));
  }

  isOdd(num) {
    return num % 2;
  }

  updateScales(event) {
    // if (!this.isFiltering) {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;

    this.filteredItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const itemX = rect.left + rect.width / 2;
      const itemY = rect.top + rect.height / 2;

      const distance = Math.sqrt(
        Math.pow(this.mouseX - itemX, 2) + Math.pow(this.mouseY - itemY, 2)
      );

      if (distance < this.guiVal.threshold) {
        const scaleFactor =
          1 + (1 - distance / this.guiVal.threshold) * this.guiVal.scaleTarget; // Scale between 1 and 1.5
        gsap.to(item, {
          scale: scaleFactor,
          duration: this.guiVal.durationTarget,
          ease: "power3",
        });
      } else {
        gsap.to(item, { scale: 1, duration: 1, ease: "power3" });
      }
    });
    // }
  }

  prefixeClasses(isPre) {
    // // console.log(this.removedItems);
    this.allItems = this.removedItems
      ? this.filteredItems.concat(this.removedItems)
      : this.filteredItems;
    // Parcourez chaque élément et modifiez la première classe
    this.allItems.forEach((element) => {
      // // console.log(element);
      const classes = element.classList;
      const imgClasses = element.children[0].classList;

      if (classes.length > 0) {
        // Ajoutez le préfixe à la première classe
        const firstClass = classes[0];
        const imgFirstClass = imgClasses[0];
        const prefixedClass = isPre
          ? `xp_products-collection_item`
          : `products-collection_item`;
        const imgPrefixedClass = isPre
          ? `xp_collection_item-img`
          : `collection_item-img`;

        // Remplacez la première classe par la classe préfixée
        classes.replace(firstClass, prefixedClass);
        imgClasses.replace(imgFirstClass, imgPrefixedClass);
      }
    });
  }
  prepareSplitText() {
    this.prepareSplitTextGrid();
    // Splitting parent for overflow
    this.cardParentSplit = new SplitText(".item-text-anim", {
      type: "words, lines",
      linesClass: ["split-parent"],
    });

    // Getting card for border animation
    this.cardTarget = document.querySelectorAll(".collection_item-card");

    this.cardTitleTrigger = ScrollTrigger.batch(this.cardParentSplit.words, {
      onEnter: (batch) => {
        gsap.from(batch, {
          duration: 1,
          delay: 0.2,
          ease: "circ.inOut",
          yPercent: 100,
          // stagger: 0.1,
        });
      },
    });
    this.cardTargetColor = window
      .getComputedStyle(document.body)
      .getPropertyValue("--swatch--grey");
    // this.focusedCollectionTitleSplit.pause();
  }

  prepareSplitTextGrid() {
    var parentSplit = new SplitText(["h1", ".grid-text"], {
      type: "lines",
      linesClass: "split-parent",
    });

    // Splitting and preparing texts
    const h1s = new SplitText("h1", { type: "chars" });
    const ps = new SplitText(".grid-text", { type: "words" });
    this.H1split = gsap.from(h1s.chars, {
      duration: 1,
      ease: "circ.inOut",
      yPercent: 115,
      stagger: 0.01,
    });
    this.Psplit = gsap.from(ps.words, {
      duration: 1,
      ease: "circ.inOut",
      yPercent: 100,
      stagger: 0.02,
    });

    this.H1split.pause();
    this.Psplit.pause();
  }

  // intersectionObserver(targets, type) {
  //   // Sélectionnez tous les éléments à animer
  //   if (targets.length > 0) {
  //     // Configuration de l'IntersectionObserver
  //     const observer = new IntersectionObserver(
  //       (entries, observer) => {
  //         entries.forEach((entry) => {
  //           if (entry.isIntersecting) {
  //             // Initialiser SplitText pour cet élément
  //             if (type === "text") {
  //               const split = new SplitText(entry.target, {
  //                 type: "chars",
  //               });

  //               // Lancer l'animation avec GSAP
  //               gsap.from(split.chars, {
  //                 duration: 1,
  //                 // delay: 1,
  //                 ease: "circ.inOut",
  //                 yPercent: 100,
  //                 stagger: 0.04,
  //               });
  //             } else {
  //               entry.target.anim.resume();
  //             }

  //             // Arrêter d'observer cet élément après l'animation (optionnel)
  //             observer.unobserve(entry.target);
  //           }
  //         });
  //       },
  //       {
  //         root: null, // Par défaut, c'est le viewport
  //         threshold: 0.1, // L'animation démarre lorsque 10% de l'élément sont visibles
  //       }
  //     );

  //     // Ajouter chaque élément au nouvel observateur
  //     targets.forEach((target) => observer.observe(target));
  //   }
  // }

  prepareButtonsHover() {
    // [this.viewButton, this.filterCTA].forEach((button) =>
    this.createHoverButton(this.viewButton, true);
    this.createHoverButton(this.filterCTA);
    if (onlyDesktop()) {
      this.createSplitTextButton(this.buttonGroup);
      this.exploreButtons.forEach((button) => {
        // console.log(button);
        this.createSplitTextButton(button);
      });
    }
    // );

    // this.viewButton.addEventListener(
    //   "mouseenter",
    //   this.handleViewHover.bind(this)
    // );
    // this.viewButton.addEventListener(
    //   "mouseleave",
    //   this.handleViewHover.bind(this)
    // );
  }
  createSplitTextButton(button) {
    const text = button.querySelector(".menu-button_txt");
    // console.log(text);

    var parentSplit = new SplitText(text, {
      type: "lines",
      linesClass: "split-parent",
    });

    var split1, split2;

    parentSplit.lines.forEach((line) => {
      const second = line.cloneNode(true); // Clone la ligne
      second.classList.add("secondLine");
      second.classList.remove("split-parent");
      split1 = new SplitText(line, { type: "chars" });
      split2 = new SplitText(second, { type: "chars" });
      text.appendChild(parentSplit.lines[0]);
      text.appendChild(second);
    });
    button.addEventListener("mouseenter", () =>
      this.buttonHoverEnter(split1, split2)
    );
  }

  handleViewHover() {
    // // console.log("ici");
    this.viewButton.classList.toggle("toGrid");
  }
  createHoverButton(button, isViewButton) {
    const innerButton = document.createElement("div");
    innerButton.classList.add("innerButton");
    this.buttonText = document.createElement("div");
    this.buttonText.classList.add("buttonText");
    const innerIcon = document.createElement("div");
    innerIcon.classList.add("innerIcon");

    if (button.classList.contains("filterCTA")) {
      for (let i = 0; i <= 2; i++) {
        const span = document.createElement("span");
        innerIcon.appendChild(span);
      }
    } else {
      for (let i = 0; i <= 8; i++) {
        const span = document.createElement("span");
        innerIcon.appendChild(span);
      }
    }

    var parentSplit = new SplitText(button, {
      type: "lines",
      linesClass: "split-parent",
    });

    let split1, split2;

    parentSplit.lines.forEach((line) => {
      const second = line.cloneNode(true); // Clone la ligne
      // // console.log(second);
      if (isViewButton)
        second.textContent = isMobileOrTabletOrLand()
          ? "experience view"
          : "grid view";
      second.classList.add("secondLine");
      second.classList.remove("split-parent");
      split1 = new SplitText(line, { type: "chars" });
      split2 = new SplitText(second, { type: "chars" });
      // // console.log(parentSplit.lines);
      this.buttonText.appendChild(parentSplit.lines[0]);
      this.buttonText.appendChild(second);
    });
    button.appendChild(innerIcon);
    innerButton.appendChild(this.buttonText);
    if (onlyDesktop() || !isViewButton) button.appendChild(innerButton);

    if (isViewButton) {
      if (isMobileOrTabletOrLand()) {
        button.addEventListener("click", () => {
          this.handleViewHover();
          // !this.isXPView ? this.tlHover.play() : this.tlHover.reverse();
        });
      } else {
        this.gridXPButtonTimeline(split1, split2);
        button.addEventListener("click", () => {
          this.leaveOnce = true;
          //  this.toggleHover(this.isXPView)
          // this.handleViewHover();
        });
        button.addEventListener("mouseenter", () =>
          this.toggleHover(this.isXPView)
        );
        button.addEventListener("mouseleave", () => {
          this.toggleHover(!this.isXPView);
        });
      }
    } else
      button.addEventListener("mouseenter", () =>
        this.buttonHoverEnter(split1, split2)
      );
    // button.addEventListener("mouseleave", () =>
    //   this.buttonHoverLeave(split1, split2)
    // );
  }

  toggleHover(isHovered) {
    if (!this.leaveOnce) this.handleViewHover();
    else this.leaveOnce = false;
    isHovered ? this.tlHover.play() : this.tlHover.reverse();
  }

  buttonHoverEnter(split1, split2) {
    gsap.to(split1.chars, {
      duration: 0.5,
      ease: "power3.inOut",
      yPercent: -100,
      stagger: 0.01,
      overwrite: true,
      onComplete: () => {
        gsap.to(split1.chars, { yPercent: 0, duration: 0 });
      },
    });
    gsap.to(split2.chars, {
      duration: 0.5,
      ease: "power3.inOut",
      yPercent: -100,
      stagger: 0.01,
      overwrite: true,
      onComplete: () => {
        gsap.to(split2.chars, { yPercent: 0, duration: 0 });
      },
    });
  }
  gridXPButtonTimeline(split1, split2) {
    this.tlHover = gsap.timeline({ paused: true });
    this.tlHover.to(split1.chars, {
      duration: 0.5,
      ease: "power3.inOut",
      yPercent: -100,
      stagger: 0.01,
      overwrite: true,
      onComplete: () => {
        // gsap.to(split1.chars, { yPercent: 0, duration: 0 });
      },
    });
    this.tlHover.to(
      split2.chars,
      {
        duration: 0.5,
        ease: "power3.inOut",
        yPercent: -100,
        stagger: 0.01,
        overwrite: true,
        onComplete: () => {
          // gsap.to(split2.chars, { yPercent: 0, duration: 0 });
        },
      },
      "<"
    );
  }

  setSnapPoints() {
    if (this.currentSlide) {
      this.snapPoints = this.currentSlides.map(
        (_, i) => -(this.itemHeight * i)
      );

      this.lastPoint = -this.snapPoints[this.snapPoints.length - 1];
      this.scrollY = -this.snapPoints[this.currentSlide];
    }
  }

  setInfoTitleTop() {
    const bottom = this.navbar.getBoundingClientRect().bottom;
    const height = window
      .getComputedStyle(this.focusedCollectionTitle)
      .getPropertyValue("font-size");
    // console.log(this.isSafari, height);
    const heightToPass =
      this.isSafari && isMobileOrTabletOrLand() ? height : `${0}px`;
    document.documentElement.style.setProperty(
      "--infoTitleTop",
      `calc(${bottom}px + ${heightToPass})`
    );
  }

  resize() {
    this.setItemCardWidth();
    // Recalculate on window resize
    window.addEventListener("resize", () => {
      // console.log("resize");
      this.drag?.kill();
      this.setupDraggable();
      this.setItemCardWidth();
      this.setPaddingFocusWrapper();
      this.setItemSize();
      this.createDragCard();
      this.setInfoTitleTop();

      if (this.focusElement)
        this.itemHeight = this.focusElement.getBoundingClientRect().height;
      if (!isMobileOrTabletOrLand()) {
        this.checkMarkeeDebounce();
      }
    });
  }

  setItemCardWidth() {
    const itemCardWidth = this.itemsCard[0].getBoundingClientRect().width;
    // // console.log(itemCardWidth);
    document.documentElement.style.setProperty(
      "--item-card-width",
      `${itemCardWidth}px`
    );
  }

  disableScrollTriggers() {
    this.firstTrigger.forEach((st) => st.disable());
    this.cardScrollTrigger.forEach((st) => st.disable());
    this.cardTitleTrigger.forEach((st) => st.disable());
  }
  enableScrollTriggers() {
    // this.firstTrigger.forEach((st) => st.enable());
    // this.cardScrollTrigger.forEach((st) => st.enable());
    this.cardTitleTrigger.forEach((st) => st.enable());
  }

  // GRID VIEW

  toggleView() {
    this.isXPView = !this.isXPView;
    this.disableViewButton();
    this.handleOverflowHTML();
    this.viewState = Flip.getState(
      this.filteredItems,
      ".page-wrapper, .xp-wrapper, .main-wrapper",
      ".products-collection_item",
      ".xp_products-collection_item",
      ".xp_products-collection_item img",
      ".xp_collection_item-img"
    );
    if (this.isXPView) {
      this.timelineToXpView();
    } else {
      this.timelineToGridView();
    }
  }

  handleOverflowHTML() {
    let htmlElement = document.querySelector("html");

    // console.log(htmlElement);
    if (this.isXPView) {
      htmlElement.classList.add("overflow-hidden");
    } else {
      htmlElement.classList.remove("overflow-hidden");
    }
  }

  timelineToXpView() {
    // this.viewButton.innerHTML = "grid view";
    const tl = gsap.timeline();

    this.disableScrollTriggers();

    // tl.to(this.other, {
    //   duration: 0,
    //   scale: 0,
    // });
    // tl.to(window, { duration: 1.5, ease: "circ.inOut", scrollTo: 0 });
    tl.add(() => {
      // // console.log("start");
      this.H1split.reversed(true);
      this.Psplit.reversed(true);
      this.H1split.resume();
      this.Psplit.resume();

      gsap.to(this.cardParentSplit.words, {
        duration: 1,
        // delay: 1,
        ease: "cubic.inOut",
        yPercent: -200,
        // stagger: {
        //   each: 0.01,
        //   from: "end",
        // },
        onComplete: () => {
          setTimeout(() => {
            gsap.to(this.cardParentSplit.words, {
              yPercent: 0,
              duration: 0,
            });
          }, 2000);
        },
      });

      gsap.to(this.allItems, {
        scale: 0,
        ease: "cubic.inOut",
        stagger: {
          each: 0.002,
          from: "end",
        },
        duration: 1,
      });

      gsap.to(".collection_item-indicator", {
        opacity: 0,
        ease: "cubic.inOut",
        stagger: {
          each: 0.01,
          from: "end",
        },
        clearProps: "opacity",
        duration: 1,
      });
      gsap.to(this.cardTarget, {
        borderColor: "transparent",
        ease: "cubic.inOut",
        stagger: {
          each: 0.01,
          from: "end",
        },
        duration: 1,
        // onComplete: () => {
        //   setTimeout(() => {
        //     // // console.log(this.cardTargetColor);
        //     gsap.to(this.cardTarget, {
        //       borderColor: `${this.cardTargetColor}`,
        //       duration: 0,
        //     });
        //   }, 2000); // 2000 ms = 2 secondes
        // },
      });
      // if (this.cardScrollTrigger) {
      //   this.cardScrollTrigger = [];
      // }

      // this.cardScrollTrigger.forEach((st) => {
      //   gsap.to(st.trigger, {
      //     border: "1px solid transparent",
      //     ease: "cubic.inOut",
      //     stagger: {
      //       each: 0.1,
      //       from: "end",
      //     },
      //     duration: 1,
      //     onComplete: () => {
      //       st.kill();
      //     },
      //   });
      // });

      // // console.log(this.cardParentSplit.words);
    });

    tl.add(() => {
      this.toggleCardVisible();
      this.xpWrapper.classList.toggle("hidden");
      this.gridWrapper.classList.toggle("main-wrapper-visible");
      this.pageWrapper.classList.toggle("screen-height");
      this.prefixeClasses(true);

      // Make UI disappear here

      this.reconstructDOM();

      this.setupDraggable();
      this.centerDrag();

      // or here ?

      // for (const [key, collection] of Object.entries(this.orderedCollections)) {
      //   collection.forEach((item) => {
      //     // // console.log(item);
      //     this.xpSectionCollection.appendChild(item.el);
      //   });
      // }
      this.flipToXp(this.viewState);
      // this.setupDraggable();
    }, "+=1.5");
    tl.to([this.filterCTA, this.controls, this.instructionZoomWrapper], {
      y: 0,
      opacity: 1,
      duration: 0.5,
      pointerEvents: "all",
      ease: "cubic.out",
    });
    this.xpSectionCollection.addEventListener("wheel", this.handleWheelXp);
  }

  timelineToGridView() {
    const tl = gsap.timeline();
    // this.viewButton.innerHTML = "xp view";
    this.removeMouseMoveListener();
    // console.log("disable 2");
    this.disableDrag();

    this.enableScrollTriggers();

    this.xpSectionCollection.removeEventListener("wheel", this.handleWheelXp);
    // UI

    tl.to(this.filteredItems, {
      delay: 0.2,
      // scale: this.scaleRatio,
      scale: 0,
      stagger: 0.01,
      overwrite: true,
      ease: "cubic.inOut",
    });

    tl.to(
      [this.filterCTA, this.controls, this.instructionZoomWrapper],
      {
        y: 50,
        opacity: 0,
        duration: 0.5,
        pointerEvents: "none",
        ease: "cubic.out",
      },
      "<"
    );

    // Events
    // tl.to(this.first, {
    //   delay: 0.2,
    //   // scale: this.scaleRatio,
    //   scale: 1,
    //   overwrite: true,
    //   ease: "cubic.inOut",
    // });
    const lists = Array.from(
      document.querySelectorAll(".products-collection_list")
    );

    // Elements
    // tl.to(
    //   this.other,
    //   {
    //     scale: 0,
    //     ease: "cubic.inOut",
    //   },
    //   "<"
    // );
    tl.add(() => {
      // this.other.forEach((el) => {
      //   el.style.display = "none";
      // });
      lists.forEach((list, i) => {
        const collection = list.dataset.collectionlist;
        this.orderedCollections[collection].forEach((item) => {
          // // console.log(item);
          list.appendChild(item.el);
        });
      });
      this.xpWrapper.classList.toggle("hidden");
      this.gridWrapper.classList.toggle("main-wrapper-visible");
      this.pageWrapper.classList.toggle("screen-height");
      this.prefixeClasses(false);
      this.flipToGrid(this.viewState);
      // // console.log(this.first);
    });
  }

  // Create drag only once
  createDragCard() {
    document.querySelectorAll(".products-collection_list").forEach((el, i) => {
      const slides = gsap.utils.toArray(
        el.querySelectorAll(".products-collection_item")
      );
      // console.log("dragCard");
      const snapPoints = slides.map((_, i) => -(this.initialItemSize * i));
      // // // console.log(slides, snapPoints);
      let direction;
      let currentSlide = 0;
      const totalWidth = snapPoints[slides.length - 1];
      const itemWidth = this.initialItemSize;

      // scrollbar
      const scrollbar = document.createElement("div");
      const thumb = document.createElement("div");

      scrollbar.classList.add("scrollbar");
      thumb.classList.add("thumb");

      scrollbar.appendChild(thumb);
      this.itemsCard[i].appendChild(scrollbar);

      Draggable.create(el, {
        type: "x",
        bounds: {
          minX: totalWidth,
          maxX: 0,
        },
        inertia: true,
        edgeResistance: 0.9,
        onDragStart: function () {
          gsap.to(scrollbar, {
            opacity: 1,
            duration: 0.5,
          });
        },
        onThrowComplete: function () {
          gsap.to(scrollbar, {
            opacity: 0,
            delay: 2,
            duration: 0.5,
          });
        },
        onDrag: function () {
          direction = this.deltaX;
          this.progress = this.x / (this.minX - itemWidth);
          // // console.log(this.x, (this.minX, itemWidth));
          thumb.style.left = `${this.progress * 100}%`;
        },
        onThrowUpdate: function () {
          this.progress = this.x / (this.minX - itemWidth);
          thumb.style.left = `${this.progress * 100}%`;
        },
        snap: function (value) {
          if (direction < 0 && currentSlide < slides.length - 1) {
            currentSlide++;
            // // console.log(currentSlide);
          } else if (direction > 0 && currentSlide > 0) {
            currentSlide--;
            // // console.log(currentSlide);
          }
          return snapPoints[currentSlide];
        },
      });
    });
  }

  viewDomChanges() {}

  toggleCardVisible() {
    this.itemsCard.forEach((card) => {
      card.classList.toggle("overflow-visible");
    });
  }

  // FOCUS

  handleClick(e) {
    // // console.log(e.currentTarget);
    // if already focus
    if (this.pauseFocus) return;
    // if grid mode
    if (!this.isXPView) {
      return;
    } else {
      // else

      // Disable things
      // console.log("disable 3");
      this.disableDrag();
      // this.disableButtons();
      // remove event listeners
      this.removeMouseMoveListener();
      this.pauseFocusListeners();
      this.xpPlace = e.currentTarget.querySelector(".xp_collection_item-img");
      // // console.log(e, e.currentTarget);
      this.focusElement = e.target;

      this.focusState = Flip.getState([
        this.focusElement,
        // this.xpWrapper,
        // this.buttonCloseFocus,
      ]);
      // e.target.classList.toggle("focusedItem"); // Add or remove the "hidden" class
      this.focusCarousel.appendChild(this.focusElement);

      if (!isMobileOrTabletOrLand()) this.appendFocusElToMarkee();

      this.focusCarousel.classList.remove("no-transition");

      const currentCollec = e.currentTarget.dataset.collection;
      const openTL = gsap.timeline();

      openTL.add(() => this.xpWrapper.classList.add("disablePointerEvents"));
      openTL.to(this.xpWrapper, {
        xPercent: isMobileOrTabletOrLand()
          ? 100
          : 60 * this.zoomInfos[this.zoomLevel].scale,
        duration: 1.5,
        ease: customEasing,
      });
      openTL.add(() => this.animFocusedText(currentCollec), 0.5);
      if (isMobileOrTabletOrLand()) {
        openTL.to(
          this.filterCTA,
          {
            y: 0,
            opacity: 0,
            duration: 0.5,
            pointerEvents: "none",
          },
          0
        );
        openTL.to(
          this.navbarWrap,
          {
            opacity: 0,
            duration: 0.5,
            ease: "expo.in",
          },
          "<"
        );
        openTL.add(() => {
          // console.log(this);
          this.navbarWrap.classList.add("none");
          this.buttonCloseFocus.classList.remove("none");
        });
      }
      // console.log("ici");
      gsap.to(this.controls, {
        y: 50,
        opacity: 0,
        duration: 0.5,
        pointerEvents: "none",
        ease: "cubic.in",
      });
      openTL.to(
        [this.viewButton, this.filterCTA, this.instructionZoomWrapper],
        {
          y: 50,
          opacity: 0,
          duration: 0.5,
          pointerEvents: "none",
          ease: "cubic.in",
          stagger: 0,
        },
        "0.1"
      );
      openTL.to(
        [this.focusCTAs, this.focusMarkee, this.focusMarkeeIndicator],
        {
          opacity: 1,
          pointerEvents: "all",
          duration: 0.5,
        },
        1.5
      );
      openTL.to(
        this.buttonCloseFocus,
        {
          scale: 1,
          opacity: 1,
          pointerEvents: "all",
          ease: "back.out",
          duration: 0.5,
        },
        1.5
      );
      openTL.from(
        this.buttonGroup.children,
        {
          yPercent: 100,
          opacity: 0,
          duration: 0.5,
          stagger: 0.1,
        },
        1.5
      );
      openTL.add(() => {
        Array.from(this.buttonGroup.children).forEach((c) =>
          c.classList.remove("disablePointerEvents")
        );
        this.addOnClickOutside();
      }, "-=0");

      // gsap ?
      this.focusWrapper.classList.add("pointerAll");
      this.xpWrapper.classList.toggle("asideGrid");
      // this.focusCTAs.classList.toggle("buttonAppear");
      // this.buttonCloseFocus.classList.toggle("buttonAppear");
      // this.focusInfos.classList.toggle("borderSide");
      // gsap.to(this.focusElement, {
      //   scale: 1,
      //   duration: this.guiVal.durationTarget,
      //   ease: "power3.inout",
      // });
      const webshopHref = e.currentTarget.dataset.webshop;

      // Buttons
      const collectionHref = this.createCollectionHref(
        e.currentTarget.dataset.collectionSlug
      );
      if (!webshopHref) {
        this.buttonGroup.querySelector(".button-regular").classList.add("none");
      } else {
        this.buttonGroup
          .querySelector(".button-regular")
          .classList.remove("none");
        this.buttonGroup.querySelector(".button-regular").href = webshopHref;
      }
      this.buttonGroup.querySelector(".button-default").href = collectionHref;

      // this.focusElement.style.transform = "scale(0.5)";
      this.flipOnFocus(this.focusState);
      const currentTarget = e.currentTarget;
      setTimeout(() => this.addCollectionItemsToCarousel(currentTarget), 1000);
      // setTimeout(() => this.closeFocus(), 2000);
    }
  }

  createCollectionHref(slug) {
    return `${window.location.href + "/collections/" + slug}`;
  }

  formatInfos(item) {
    const type = item.dataset.type;
    const size = item.dataset.size;
    return `${type + " ⌀ " + size}`;
  }

  addCollectionItemsToCarousel(currentTarget) {
    this.currentSlideInfos = [];

    // Push focused el infos
    const text = this.formatInfos(currentTarget);
    this.currentSlideInfos.push(text);

    // Push every other el infos
    const currentCollec = currentTarget.dataset.collection;
    const currentCollecItems = this.orderedCollections[currentCollec];
    currentCollecItems.forEach((item) => {
      if (currentTarget === item.el) return;
      const text = this.formatInfos(item.el);
      this.currentSlideInfos.push(text);

      const img = item.el.querySelector("img");
      if (img) {
        const clonedImage = img.cloneNode(true);
        const clonedImageMarkee = img.cloneNode(true);
        gsap.from(clonedImage, {
          opacity: 0,
          scale: 0,
          delay: 0.5,
          ease: "back.out",
        });
        this.focusCarousel.appendChild(clonedImage);
        if (!isMobileOrTabletOrLand())
          this.focusMarkee.appendChild(clonedImageMarkee);
      }
    });

    this.createFocusDrag(currentCollecItems);

    if (!isMobileOrTabletOrLand()) {
      this.checkSplitTextOverlap();
      setTimeout(() => {
        this.calculMarkeeHeight();
      }, 1000);
      this.addMarkeeListeners();
    }
  }

  addMarkeeListeners() {
    Array.from(this.focusMarkee.children).forEach((c, i) => {
      c.setAttribute("data-index", i);
      c.addEventListener("click", this.handleClickMarkee);
    });
  }

  removeMarkeeListeners() {
    Array.from(this.focusMarkee.children).forEach((c) => {
      // opt.removeAttribute("data-value", el.dataset[data]);
      c.removeEventListener("click", this.handleClickMarkee);
    });
  }

  handleClickMarkeeItem(e) {
    this.isClicking = true;
    const index = +e.target.dataset.index;
    if (index === this.currentSlide) return;
    this.distance = Math.abs(index - this.currentSlide);
    // console.log(this.currentSlide, this.distance);
    this.currentSlide = index;
    this.scrollY = this.itemHeight * index;

    // this.currentEase = easeOutQuad;
    this.easeFactor = 0.1 / (this.distance * 1.75);
    // this.updateScrollPositionClick(distance);
    this.updateContextualInfosThrottle(this.currentSlide);
  }

  calculMarkeeHeight() {
    this.focusMarkeeHeight = this.focusMarkee.getBoundingClientRect().height;
    this.focusCarouselHeight =
      this.focusCarousel.getBoundingClientRect().height;
  }

  checkMarkeeDebounce = debounce(() => {
    this.checkSplitTextOverlap();

    this.calculMarkeeHeight();

    this.setSnapPoints();
  }, 100);

  checkSplitTextOverlap() {
    this.focusMarkeeWrapper.classList.remove("littleItems");
    const bottom = this.focusedCollectionTitle.getBoundingClientRect().bottom;
    const top = this.focusMarkeeWrapper.getBoundingClientRect().top;

    if (top - bottom < 30) {
      this.focusMarkeeWrapper.classList.add("littleItems");
    } else {
      this.focusMarkeeWrapper.classList.remove("littleItems");
    }
  }

  appendFocusElToMarkee() {
    const clonedFocusEl = this.focusElement.cloneNode(true);
    this.focusMarkee.appendChild(clonedFocusEl);
  }

  animFocusedText(currentCollec) {
    this.focusedCollectionTitle.innerText = currentCollec;
    var parentSplit = new SplitText(this.focusedCollectionTitle, {
      type: "lines",
      linesClass: "split-parent line-height-slightup",
    });
    const focusedTitle = new SplitText(this.focusedCollectionTitle, {
      type: "words, chars",
    });

    // this.focusedCollectionTitleSplit = gsap.from(focusedTitle.words, {
    this.focusedCollectionTitleSplit = gsap.fromTo(
      focusedTitle.chars,
      {
        yPercent: 115,
      },
      {
        duration: 1,
        ease: "expo.inOut",
        stagger: 0.05,
        yPercent: -10,
        // stagger: 0.2,
      }
    );
  }

  closeFocus(e) {
    this.removeClickListener();
    this.removeEventsSlider();

    this.enableDrag();
    this.enableButtons();

    this.addMouseMoveListener();
    this.allowFocusListeners();

    // this.focusedCollectionTitleSplit.reverse();

    this.updateContextualInfosThrottle.cancel();

    const closeTL = gsap.timeline();

    // console.log(this.infosSplit);

    closeTL.to(this.xpWrapper, {
      xPercent: 0,
      duration: 1.5,
      ease: "expo.inOut",
    });
    // console.log(this.focusWrapper.children);
    closeTL.to(
      this.focusWrapper.children,
      {
        x: isMobileOrTabletOrLand() ? "-100vw" : "-60vw",
        // xPercent: "-60",
        duration: 1.5,
        ease: "expo.inOut",
        onStart: () => this.focusCarousel.classList.add("no-transition"),
        onUpdate: () => {
          this.focusCarouselX = gsap.getProperty(this.focusInfos, "x"); // Mise à jour propre
        },
      },
      0
    );
    closeTL.to(
      this.buttonCloseFocus,
      {
        scale: 0,
        duration: 0.5,
        ease: "back.in",
        pointerEvents: "none",
      },
      0
    );
    if (isMobileOrTabletOrLand()) {
      closeTL.to(
        this.focusCTAs,
        {
          opacity: 0,
          duration: 0.5,
        },
        1
      );
      closeTL.add(() => this.navbarWrap.classList.remove("none"), 1);
      closeTL.to(
        this.navbarWrap,
        {
          opacity: 1,
          duration: 0.5,
          ease: "expo.in",
        },
        1
      );
    } else {
      closeTL.to(
        this.focusCTAs,
        {
          opacity: 0,
          pointerEvents: "none",
          duration: 0.5,
        },
        1
      );
    }

    closeTL.set(this.focusElement, { scale: 0 }, 0.9);
    closeTL.add(() => this.xpPlace.appendChild(this.focusElement), 0.9);
    closeTL.to(this.focusElement, { scale: 1, ease: "back.out" }, 1);
    closeTL.add(() => this.xpWrapper.classList.toggle("asideGrid"), 2);
    closeTL.add(() => (this.focusCarousel.innerHTML = ""), 1);
    // // console.log(this.focusCarousel.innerHTML);
    closeTL.add(() => {
      // console.log(this.infosSplit);
      // // console.log("restart");
      // this.focusedCollectionTitleSplit.revert();
      // this.focusedCollectionTitleSplit.pause();
      this.hideContextualInfos();
      // Reset Carousel
      this.focusMarkee.innerHTML = "";
      this.contextualInfo.innerText = "";
      this.focusedCollectionTitle.innerText = "";
      this.scrollY = 0;
      // this.updateMarkee();
      // this.updateScrollPositionScroll();
    }, 1);
    closeTL.to(
      [this.focusMarkee, this.focusMarkeeIndicator],
      {
        opacity: 0,
        // pointerEvents: "none",
        duration: 0.5,
      },
      1
    );
    closeTL.to(
      this.focusWrapper.children,
      {
        x: 0,
        y: 0,
        duration: 0,
        onUpdate: () => {
          this.focusCarouselX = gsap.getProperty(this.focusInfos, "x"); // Mise à jour propre
        },
      },
      "-=0"
    );
    gsap.to(this.controls, {
      y: 0,
      delay: 1,
      opacity: 1,
      duration: 0.5,
      pointerEvents: "all",
      ease: "cubic.inOut",
    });
    if (isMobileOrTabletOrLand()) {
      closeTL.set(this.viewButton, { y: 0 }, "=-1.5");
      closeTL.to(
        [this.viewButton, this.filterCTA, this.instructionZoomWrapper],
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          pointerEvents: "all",
          ease: "cubic.out",
        },
        "=-1.5"
      );
    } else {
      closeTL.to(
        [this.viewButton, this.filterCTA, this.instructionZoomWrapper],
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          pointerEvents: "all",
          ease: "cubic.inOut",
        },
        "1"
      );
    }

    closeTL.add(() => {
      this.xpWrapper.classList.remove("disablePointerEvents");
    }, "=-0.9");

    closeTL.add(() => {
      Array.from(this.buttonGroup.children).forEach((c) =>
        c.classList.add("disablePointerEvents")
      ),
        // Restart markee
        this.restartMarkee();
    });

    //reset things

    // closeTL.set(this.focusWrapper.children, {
    //   x: "0",
    //   delay: 1,
    // });
    // this.buttonCloseFocus.classList.toggle("buttonAppear");
    // this.focusCTAs.classList.toggle("buttonAppear");
    // gsap.to(".focusCarousel", {
    //   y: 0,
    //   ease: "ease.inOut",
    //   duration: 1,
    // });

    setTimeout(() => {
      // this.focusState = Flip.getState([
      //   this.focusElement,
      //   // this.xpWrapper,
      //   // this.buttonCloseFocus,
      // ]);
      // Array.from(this.focusWrapper.children).forEach((el) => {
      //   el.style.left = "-60vw";
      //   // // console.log(el);
      // });
      // this.flipOnFocus(this.focusState);
    }, 800);
    setTimeout(() => {
      this.focusWrapper.classList.remove("pointerAll");
    }, 500);
  }

  // Appel de la fonction throttle avec un callback
  updateContextualInfosThrottle = debounce((activeIndex) => {
    // // console.log("change");
    // should better cancel debounce
    this.updateContextualInfos(activeIndex); // Appel de la fonction avec l'index
  }, 500);

  getActiveIndex(scrollPosition, snapPoints) {
    // Calculer l'index en divisant la position de défilement par la hauteur de l'élément
    const index = Math.floor(scrollPosition / this.itemHeight);
    // S'assurer que l'index reste dans les bornes de snapPoints
    return Math.min(Math.max(index, 0), snapPoints.length - 1);
  }

  // updateFocusScroll(self, snapPoints) {
  //   // // console.log(self);
  //   if (this.isDragging) return;
  //   const scrollPosition = self.scroll();
  //   const activeIndex = this.getActiveIndex(
  //     scrollPosition,
  //     snapPoints,
  //     this.itemHeight
  //   );

  //   this.updateContextualInfosThrottle(activeIndex);
  // } // Limite l'exécution à 500ms

  setPaddingFocusWrapper() {
    // this.focusElement.getBoundingClientRect().width;
    const itemHeight = window.innerHeight * 0.4;
    this.paddingFocusWrapper = Math.max(
      (window.innerHeight - itemHeight) / 3,
      60
    );
    this.focusWrapper.style.paddingTop = !isMobileOrTabletOrLand()
      ? `${this.paddingFocusWrapper}px`
      : 0;
  }

  createFocusDrag(slides) {
    this.currentSlide = 0;
    this.currentSlides = slides;
    this.itemHeight;
    if (isMobileOrTabletOrLand()) this.itemHeight = window.innerWidth;
    else this.itemHeight = this.focusElement.getBoundingClientRect().height;

    const bottom = this.focusElement.getBoundingClientRect().bottom;
    // this.difference = window.innerHeight - bottom;
    // this.focusElement.style.paddingTop = `calc(${this.difference}px)`;

    this.snapPoints = this.currentSlides.map((_, i) => -(this.itemHeight * i));
    this.isScrolling = false; // Pour éviter le spam du scroll

    this.lastPoint = -this.snapPoints[this.snapPoints.length - 1];

    this.offsetDragY = 0;
    this.initialDragY = 0;
    this.dragDirection = 0;
    this.focusDragY = 0;

    this.focusCarousel.style.cursor = "grab";

    if (onlyDesktop()) {
      this.addEventsSlider();
      this.raf = requestAnimationFrame(this.updateScrollSlider.bind(this));
    } else {
      setTimeout(() => {
        this.createFocusDragMobile();
      }, 700);
    }

    // To comment apparently
    this.updateContextualInfosThrottle(this.currentSlide);
  }

  createFocusDragMobile() {
    let direction = 0;
    this.focusDrag = Draggable.create(".focusCarousel", {
      type: "y",
      bounds: {
        minY: this.snapPoints[this.currentSlides.length - 1],
        maxY: 0,
      },
      inertia: true,
      edgeResistance: 0.9,
      onDrag: () => {
        direction = this.focusDrag[0].deltaY;
      },
      snap: () => {
        if (
          direction < 0 &&
          this.currentSlide < this.currentSlides.length - 1
        ) {
          this.currentSlide++;
        } else if (direction > 0 && this.currentSlide > 0) {
          this.currentSlide--;
        }

        // console.log(this.currentSlide);
        // this.scrollY = -this.snapPoints[this.currentSlide];
        this.updateContextualInfosThrottle(this.currentSlide);
        return this.snapPoints[this.currentSlide];
      },
    });
  }

  addEventsSlider() {
    this.addWheelEvent(this.snapPoints);

    this.focusCarousel.addEventListener("mousedown", this.dragMouseDown);
    document.addEventListener("mousemove", this.dragMouseMove);
    document.addEventListener("mouseup", this.dragMouseUp);
  }

  removeEventsSlider() {
    this.removeWheelEvent();
    // console.log("remove");
    this.focusCarousel.removeEventListener("mousedown", this.dragMouseDown);
    document.removeEventListener("mousemove", this.dragMouseMove);
    document.removeEventListener("mouseup", this.dragMouseUp);
  }

  dragMouseDown(event) {
    // // console.log(this.focusCarousel);
    this.isScrolling = false;
    this.isDragging = true;
    this.dragDirection = 0;
    this.initialDragY = event.clientY * 2;
    this.offsetDragY =
      event.clientY * 2 -
      (this.focusCarousel.offsetTop - this.paddingFocusWrapper) +
      this.scrollY;
    this.focusCarousel.style.cursor = "grabbing";
  }

  dragMouseMove(event) {
    if (this.isDragging) {
      this.focusDragY = event.clientY * 2 - this.offsetDragY;
      this.scrollY = -this.focusDragY;
      this.dragDirection = event.clientY * 2 - this.initialDragY;
    }
  }

  dragMouseUp() {
    this.isScrolling = false;
    this.isDragging = false;
    this.focusCarousel.style.cursor = "grab";

    this.easeFactor = 0.02;
    this.dragSnapToClosest();
  }

  restartMarkee() {
    // console.log(this.raf, "raf");
    cancelAnimationFrame(this.raf);
    this.y = 0;
    this.currentScroll = 0;
    this.focusMarkeeIndicator.style.transform = `translate3d(0, ${this.y}px, 0)`;
  }
  // Initialiser l'événement `wheel` pour faire défiler
  addWheelEvent(snapPoints) {
    // console.log("addWheelEvent");
    this.handleWheelBound = (e) => this.handleWheel(e, snapPoints);
    this.focusWrapper.addEventListener("wheel", this.handleWheelBound, {
      passive: false,
    });
  }

  removeWheelEvent() {
    if (this.handleWheelBound) {
      // console.log("removeWheelEvent");
      this.focusWrapper.removeEventListener("wheel", this.handleWheelBound);
      // this.handleWheelBound = null;
    }
  }

  handleWheel(e, snapPoints) {
    // console.log(this.currentEase);
    this.isDragging = false;
    this.easeFactor = 0.02;
    this.currentEase = easeOut;
    e.preventDefault();
    // if (!this.isScrolling) return; // Empêcher le scroll excessif
    this.isScrolling = true;

    this.scrollSpeed = e.deltaY;

    // this.raf = requestAnimationFrame(this.updateScrollSlider.bind(this));

    // // // console.log(
    //   "start",
    //   this.scrollY,
    //   this.scrollY <= 0 && Math.sign(e.deltaY) === -1
    // );

    // if (
    //   (this.scrollY <= 0 && Math.sign(e.deltaY) === -1) ||
    //   (this.scrollY >= -snapPoints[snapPoints.length - 1] &&
    //     Math.sign(e.deltaY) === 1)
    // ) {
    //   this.isScrolling = false;
    //   return;
    // }
    // this.scrollY += e.deltaY; // On ajuste la position du conteneur avec deltaY

    this.direction = e.deltaY < 0 ? 1 : -1;

    // this.scrollY = this.itemHeight * this.currentSlide;
    this.updateContextualInfosThrottle(this.currentSlide);

    if (!this.isSnappingScroll) {
      // this.currentSlide = Math.min(
      //   Math.max(this.currentSlide + direction, 0),
      //   snapPoints.length - 1
      // );

      // // console.log(e.deltaY);
      this.scrollY += e.deltaY;
      this.updateScrollPositionScrolling();
    }
    // this.focusDrag[0].y = this.scrollY;

    // Détecter la fin du scroll (inférieur à 5 par exemple)
    // En fonction de la direction, déterminer l'élément suivant
    // Lancer un GSAP to (qui peut être cancel si le scroll se déclenche à nouveau)
    // Avoir cette valeur dans un scrollY general, et faire scroll le drag aussi
  }

  // Mettre à jour la position de défilement
  // updateScrollPositionDrag() {
  //   // On applique un "scroll" natif sur la position du conteneur
  //   gsap.to(this.focusCarousel, {
  //     y: -this.scrollY,
  //     duration: 0.3,
  //     ease: "power2.out",
  //   });
  // }

  updateScrollPositionScrolling() {
    // // console.log("scrolling");
    // On applique un "scroll" natif sur la position du conteneur
    // // console.log(this.scrollY);
    // this.posScroll = gsap.to("body", {
    //   y: -this.scrollY,
    //   duration: 0.2,
    //   ease: "power3.out",
    // });
  }
  updateScrollPositionScrollend() {
    // On applique un "scroll" natif sur la position du conteneur

    this.checkEaseFactor();

    this.currentEase = easeOutQuart;
    this.posScroll = gsap.to("body", {
      x: 0,
      duration: 0.7,
      // ease: easeOut,
      overwrite: true,
      onStart: () => {
        setTimeout(() => {
          // console.log("start");
          this.isSnappingScroll = false;
          this.isScrolling = false;
          // this.easeFactor = 0.01;
        }, 100);
        // setTimeout(() => {
        //   this.easeFactor = 0.02;
        //   this.currentEase = easeOut;
        // }, 1000);
      },
    });
  }
  updateScrollPositionClick(distance) {
    let dur = 8 * distance;
    // console.log(typeof dur, dur);
    const tl = gsap.timeline();
    // gsap.killTweensOf(this.focusCarousel);
    // On applique un "scroll" natif sur la position du conteneur
    tl.to(this.focusCarousel, {
      y: `${-this.scrollY}px`,
      ease: "sine.inOut",
      overwrite: true,
      onComplete: () => (this.isClicking = false),
      duration: dur,
    });
  }

  updateScrollSlider() {
    if (Math.abs(this.currentScroll - this.scrollY) > 0.01) {
      // // console.log("lerp", this.currentScroll, this.scrollY);
      // // console.log(this.easeFactor);

      if (this.scrollY < -10) {
        // console.log(this.scrollY);
        this.scrollY = 0;
        // return;
      }
      if (
        this.scrollY > Math.abs(this.snapPoints[this.snapPoints.length - 1])
      ) {
        this.scrollY = Math.abs(this.snapPoints[this.snapPoints.length - 1]);
        // console.log(this.scrollY);
        // return;
      }

      this.currentScroll = lerpWithEase(
        this.currentScroll,
        this.scrollY,
        this.easeFactor,
        this.currentEase
      );
      if (this.isScrolling) {
        // // console.log("lerp", this.currentScroll, this.scrollY);
        this.updateScrolValues();
      }

      // if (this.isScrolling) {
      //   this.currentScroll = lerp(
      //     this.currentScroll,
      //     this.scrollY, // ✅ Cible correcte
      //     0.1
      //   );
      // } else if (this.isClicking) {
      //   this.currentScroll = lerp(
      //     this.currentScroll,
      //     this.scrollY, // ✅ Cible correcte
      //     0.1
      //   );
      // } else if (this.isSnappingScrolL) {
      //   this.currentScroll = lerp(
      //     this.currentScroll,
      //     this.scrollY, // ✅ Cible correcte
      //     0.1
      //   );
      // }
    }
    this.focusCarousel.style.transform = `translateY(${-this
      .currentScroll}px) translateX(${this.focusCarouselX}vw)`;
    this.updateMarkee();
    // // // console.log("isDragging", this.isDragging, "isScrolling", this.isScrolling);

    this.raf = requestAnimationFrame(this.updateScrollSlider.bind(this));

    // // // console.log(
    //   (this.scrollY / this.focusCarouselHeight) * this.focusMarkeeHeight
    // );
    // gsap.to(this.focusMarkeeIndicator, {
    //   y:
    //     (this.scrollY / this.focusCarouselHeight) *
    //     (this.focusMarkeeHeight + 12),
    //   duration: 0.5,
    //   ease: "power2.inOut",
    //   overwrite: "auto",
    //   onComplete: () => {}, // Débloquer après l'animation
    // });
  }

  checkEaseFactor() {
    if (this.itemHeight / 4 < Math.abs(this.currentScroll - this.scrollY)) {
      // this.currentEase = easeOutQuad;
      this.easeFactor = 0.01;
      // // console.log("ici");
    } else this.easeFactor = 0.02;
  }

  checkBounds() {
    if (
      this.scrollY > 0 &&
      this.scrollY < Math.abs(this.snapPoints[this.snapPoints.length - 1])
    )
      return true;
    else false;
  }
  clamp(val) {
    return Math.min(Math.max(val, 0), this.lastPoint);
  }

  updateScrolValues() {
    const scrollSpeed = Math.abs(this.scrollSpeed);
    // // console.log(scrollSpeed);

    if (this.lastScrollSpeed > scrollSpeed && scrollSpeed < 5) {
      // // console.log(this.isSnappingScroll);
      if (!this.isSnappingScroll) this.snapToClosest();
      this.isScrolling = false;
      this.isSnappingScroll = true;
      // // console.log(this.isSnappingScroll);
    }
    this.lastScrollSpeed = scrollSpeed;
  }

  snapToClosest() {
    // // console.log("snap");
    this.currentSlide = this.getClosestSnapPoint(
      // -this.scrollY,
      -this.currentScroll,
      this.snapPoints,
      this.direction
    );
    // // console.log("closest", this.currentSlide);
    this.scrollY = -this.snapPoints[this.currentSlide];
    this.currentEase = easePower3Out;
    // this.setFocusDragY(-this.scrollY);
    // this.updatePosition();
    // // console.log("closest", this.focusDrag[0].y);
    // this.focusDrag[0].update();
    // this.easeFactor = 0.01;
    // // // console.log(this.scrollY);
    // this.updateContextualInfosThrottle(this.currentSlide);
    this.updateScrollPositionScrollend();
  }

  dragSnapToClosest() {
    // console.log("snapToClosest", this.dragDirection);
    if (this.dragDirection === 0) return; // Pas de mouvement, on reste où on est

    if (
      this.dragDirection < 0 &&
      this.currentSlide < this.currentSlides.length - 1
    ) {
      this.currentSlide++;
    } else if (this.dragDirection > 0 && this.currentSlide > 0) {
      this.currentSlide--;
    }
    this.scrollY = -this.snapPoints[this.currentSlide];
    this.focusDragY = this.scrollY;

    // console.log(
    //   this.itemHeight / 4,
    //   Math.abs(this.currentScroll - this.scrollY)
    // );
    this.checkEaseFactor();
    // this.currentScroll = this.scrollY;
    // this.updatePosition();
    // // // console.log(this.scrollY);
    this.updateContextualInfosThrottle(this.currentSlide);
  }

  updateMarkee() {
    // // console.log("updateMarkee");
    if (this.isDragging) {
      this.markeeScroll = lerp(
        this.markeeScroll,
        this.scrollY, // ✅ Cible correcte
        0.1
      );
      this.y =
        (this.markeeScroll / this.focusCarouselHeight) *
        (this.focusMarkeeHeight + 12);
      // // console.log(this.currentScroll);
    } else if (this.isScrolling) {
      this.markeeScroll = lerp(
        this.markeeScroll,
        this.scrollY, // ✅ Cible correcte
        0.1
      );
      this.y =
        (this.markeeScroll / this.focusCarouselHeight) *
        (this.focusMarkeeHeight + 12);
    } else if (this.isClicking) {
      // // console.log(this.isClicking);
      this.markeeScroll = lerp(
        this.markeeScroll,
        this.scrollY, // ✅ Cible correcte
        0.1 / (this.distance * 0.75)
      );
      this.y =
        (this.markeeScroll / this.focusCarouselHeight) *
        (this.focusMarkeeHeight + 12);
    } else {
      this.markeeScroll = lerp(
        this.markeeScroll,
        this.scrollY, // ✅ Cible correcte
        0.1
      );
      this.y =
        (this.markeeScroll / this.focusCarouselHeight) *
        (this.focusMarkeeHeight + 12);
    }
    // // console.log(
    //   this.markeeScroll,
    //   this.focusCarouselHeight,
    //   this.markeeScroll / this.focusCarouselHeight
    // );
    this.focusMarkeeIndicator.style.transform = `translate3d(0, ${this.y}px, 0)`;
  }

  updateContextualInfos(currentSlide) {
    // // console.log("test");
    if (this.infosSplit) this.hideContextualInfos();
    // weird way to check if has close slider
    if (!this.drag.enabled()) {
      setTimeout(() => {
        this.contextualInfo.innerText = this.currentSlideInfos[currentSlide];
        var parentSplit = new SplitText(this.contextualInfo, {
          type: "lines",
          linesClass: "split-parent",
        });
        this.infosSplit = new SplitText(this.contextualInfo, { type: "chars" });
        this.showContextualInfos();
      }, 500);
    }
  }

  getClosestSnapPoint(current, snapPoints, direction) {
    // if (direction === 0) return current; // Pas de mouvement, on reste où on est
    if (direction < 0) {
      // Scroll vers le bas → Cherche le plus petit point supérieur

      var closest = snapPoints.findIndex((point) => point < current);
      if (closest === -1) closest = snapPoints.length - 1;
    } else {
      // Scroll vers le haut → Cherche le plus grand point inférieur
      var closest = snapPoints.findLastIndex((point) => point > current);
      if (closest === -1) closest = 0;
    }
    return closest;
  }

  hideContextualInfos() {
    // console.log(this.infosSplit);
    if (this.infosSplit && this.infosSplit.chars)
      gsap.to(this.infosSplit.chars, {
        // duration: 0,
        duration: 0.5,
        ease: "cubic.inOut",
        yPercent: -100,
        stagger: 0.005,
        onComplete: () => {
          // console.log("complete chars");
          // gsap.set(this.infosSplit.chars, { yPercent: 100 });
        },
      });
  }

  showContextualInfos() {
    gsap.from(this.infosSplit.chars, {
      duration: 0.5,
      ease: "cubic.inOut",
      yPercent: 100,
      stagger: 0.005,
    });
  }

  addFocusListeners() {
    this.filteredItems.forEach((item) => {
      item.addEventListener("click", this.handleClick.bind(this));
    });
  }
  pauseFocusListeners() {
    this.pauseFocus = true;
  }
  allowFocusListeners() {
    this.pauseFocus = false;
  }

  addMouseMoveListener() {
    window.addEventListener("mousemove", this.throttledMouseMove);
  }
  removeMouseMoveListener() {
    window.removeEventListener("mousemove", this.throttledMouseMove);
  }

  disableViewButton() {
    this.viewButton.disabled = true;
  }
  enableViewButton() {
    this.viewButton.disabled = false;
  }

  disableButtons() {
    this.viewButton.classList.add("hidden");
    this.filterCTA.classList.add("hidden");
  }
  enableButtons() {
    this.viewButton.classList.remove("hidden");
    this.filterCTA.classList.remove("hidden");
  }

  // GUI
  initGUI() {
    // Creating a GUI and a subfolder.
    var gui = new dat.GUI();
    var anim = gui.addFolder("Animations");
    var gap = gui.addFolder("Gaps");

    // Add a number controller slider.
    if (!isMobileOrTabletOrLand()) {
      anim.add(this.guiVal, "throttleInterval", 0, 200).onChange(() => {
        this.removeMouseMoveListener();
        this.throttledMouseMove = throttle(
          this.updateScales.bind(this),
          this.guiVal.throttleInterval
        ); // 50ms interval
        this.addMouseMoveListener();
      });
    }

    anim.add(this.guiVal, "scaleTarget", 0.1, 2);
    anim.add(this.guiVal, "durationTarget", 0.1, 2);
    anim.add(this.guiVal, "threshold", 100, 600);

    const columns = document.querySelectorAll(".column");

    gap.add(this.guiVal, "ratioOut", -1, 1, 0.01).onChange((value) => {
      this.zoomInfos[1].ratioIn = value; // Mise à jour du CSS
    });
    // gap.add(this.guiVal, "verticalGap", 0, 5).onChange((value) => {
    //   columns.forEach((col) => {
    //     col.style.gap = `${value}rem`; // Mise à jour du CSS
    //   });
    // });
  }

  centerDrag(withAnim) {
    this.xpSectionCollection.classList.remove("drag-easing");

    // console.log(
    //   (this.xpWrapper.offsetWidth - this.xpSectionCollection.offsetWidth) / 2 -
    //     (isMobileOrTabletOrLand() ? window.innerWidth / 2 : 0)
    // );
    gsap.to(".xp_section_collection", {
      duration: withAnim ? 1 : 0,
      x:
        (this.xpWrapper.offsetWidth - this.xpSectionCollection.offsetWidth) /
          2 -
        (isMobileOrTabletOrLand() ? window.innerWidth / 2 : 0),
      y:
        (this.xpWrapper.offsetHeight - this.xpSectionCollection.offsetHeight) /
          2 -
        50, // Aucun décalage vertical
      ease: "expo.inOut",
      // delay: 1,
      onComplete: () => {
        setTimeout(() => {
          this.xpSectionCollection.classList.add("drag-easing");
        }, 100);
      },
    });
  }

  zoomOnInit() {
    const tl = gsap.timeline({});
    this.lazyImages = document.querySelectorAll("img");

    // Init wrapper and drag
    tl.to(this.xpWrapper, {
      scale: 0.5,
      width: "calc(200vw + 2px)",
      height: "calc(200vh + 2px)",
      left: "50%",
      top: "50%",
      x: "-50%",
      y: "-50%",
      duration: 0,
    });

    const centerX =
      (this.xpWrapper.offsetWidth - this.xpSectionCollection.offsetWidth) / 2 -
      (isMobileOrTabletOrLand() ? window.innerWidth / 2 : 0);
    const centerY =
      (this.xpWrapper.offsetHeight - this.xpSectionCollection.offsetHeight) /
        2 -
      50;

    // console.log(centerX);

    tl.to(".xp_section_collection", {
      x: centerX,
      y: centerY,
      duration: 0,
      ease: "none",
    });

    const imagesInViewport = [];
    const imagesOutsideViewport = [];

    this.lazyImages.forEach((img) => {
      (this.isInViewport(img) ? imagesInViewport : imagesOutsideViewport).push(
        img
      );
    });

    // // console.log(imagesOutsideViewport.length);
    // console.log(imagesInViewport);
    gsap.to(imagesInViewport, {
      scale: 1,
      ease: "back.out",
      duration: 0.5,
      delay: 0.25,
      stagger: {
        amount: 1.5,
        from: "random",
      },
    });

    tl.to(this.xpWrapper, {
      scale: 1,
      duration: 2,
      // width: "100vw",
      // height: "100vh",
      // x: "-50%",
      // y: "-50%",
      // transform: "translate(50%, 50%)",
      delay: 2,
      ease: "expo.inOut",
      onComplete: () => {
        // console.log(this.xpSectionCollection);
        gsap.to(this.xpWrapper, {
          duration: 0,
          width: "calc(2px + 100lvw)",
          height: "calc(2px + 100lvh)",
        });
        // this.xpWrapper.classList.add("ease");
        this.addFocusListeners();
        this.centerDrag(false);
        this.enableDrag();
        this.setScrollViewBasedOnDrag();
        setTimeout(() => {
          this.xpSectionCollection.classList.add("drag-easing");
        }, 200);
      },
    });

    this.initLazyImages(imagesOutsideViewport);

    tl.to(
      [this.viewButton, this.filterCTA, this.instructionZoomWrapper],
      {
        y: -0,
        opacity: 1,
        duration: 1,
        ease: "cubic.inOut",
        stagger: 0.2,
      },
      "-=0.5"
    );
    tl.add(() => {
      if (!isMobileOrTabletOrLand()) this.initWidthFilters();
      // this.enableDrag();
      this.xpSectionCollection.addEventListener("wheel", this.handleWheelXp);
    }, "-=0");
  }

  isInViewport = (el) => {
    const rect = el.getBoundingClientRect();
    return (
      rect.right <= this.drag.x + window.innerWidth + 100 &&
      rect.bottom <= this.drag.y + window.innerHeight + 100 &&
      rect.left >= this.drag.x &&
      rect.top >= this.drag.y
    );
  };
  // NOT FOUND

  showNotFound() {
    // // console.log("yes");
    this.notFound.classList.add("not_found_visible");
  }
  hideNotFound() {
    this.notFound.classList.remove("not_found_visible");
  }

  addOnClickOutside() {
    document.addEventListener("mousedown", this.outsideClickListener);
  }

  removeClickListener() {
    // // console.log("remove");
    document.removeEventListener("mousedown", this.outsideClickListener);
  }

  outsideClickListener(e) {
    // console.log(e.target);
    if (
      !this.focusCarousel.contains(e.target) &&
      !this.focusInfos.contains(e.target) &&
      !this.focusCTAs.contains(e.target) &&
      !this.focusMarkeeWrapper.contains(e.target) /*&& isVisible(element)*/
    ) {
      // or use: event.target.closest(selector) === null
      // // console.log("close");
      this.closeFocus();
    }
  }
  setScrollViewBasedOnDrag() {
    this.newX = this.drag.x;
    this.newY = this.drag.y;
    // console.log(this.drag.x);
  }

  addEventsZoom() {
    this.zoomInEl = this.instructionZoomWrapper.querySelector(".zoomin");
    this.zoomOutEl = this.instructionZoomWrapper.querySelector(".zoomout");

    this.zoomInEl.addEventListener("click", this.handleZoomIn.bind(this));
    this.zoomOutEl.addEventListener("click", this.handleZoomOut.bind(this));
    this.checkZoomLevel();
  }

  handleZoomIn() {
    this.zoomLevel++;
    this.checkZoomLevel();
    this.zoomIn();
    this.temporaryDisableZoom();
  }
  handleZoomOut() {
    this.zoomLevel--;
    this.checkZoomLevel();
    this.zoomOut();
    this.temporaryDisableZoom();
  }

  checkZoomLevel() {
    if (this.zoomLevel === 2) this.zoomInEl.classList.add("zoom-disabled");
    else this.zoomInEl.classList.remove("zoom-disabled");
    if (this.zoomLevel === 0) this.zoomOutEl.classList.add("zoom-disabled");
    else this.zoomOutEl.classList.remove("zoom-disabled");
  }

  temporaryDisableZoom() {
    this.disableDrag();
    this.xpSectionCollection.removeEventListener("wheel", this.handleWheelXp);

    this.zoomInEl.classList.add("disablePointerEvents");
    this.zoomOutEl.classList.add("disablePointerEvents");
    this.xpSectionCollection.classList.add("disablePointerEvents");

    setTimeout(() => {
      this.zoomInEl.classList.remove("disablePointerEvents");
      this.zoomOutEl.classList.remove("disablePointerEvents");
      this.xpSectionCollection.classList.remove("disablePointerEvents");

      this.enableDrag();
      this.xpSectionCollection.addEventListener("wheel", this.handleWheelXp);
    }, 1600);
  }

  zoomIn() {
    const tl = gsap.timeline();

    this.xpSectionCollection.classList.remove("drag-easing");

    this.wrapperScale(tl);
    this.wrapperDimensions(tl);
    tl.add(() => this.resetDraggable());
    this.handleAsideGrid();
    // tl.add(() => this.centerDrag(true), "<");
  }

  zoomOut() {
    const tl = gsap.timeline();

    this.wrapperDimensions(tl, true);
    this.centerDrag(true);
    this.wrapperScale(tl, true);
    tl.add(() => this.resetDraggable());
    this.handleAsideGrid();
  }

  handleAsideGrid() {
    if (this.zoomLevel === 0)
      document.documentElement.style.setProperty("--asideWidth", "3px");
    else if (this.zoomLevel === 1)
      document.documentElement.style.setProperty("--asideWidth", "2px");
    else document.documentElement.style.setProperty("--asideWidth", "1px");
  }

  wrapperDimensions(tl, out) {
    // console.log("start :", this.drag.x);
    tl.to(this.xpWrapper, {
      width: `calc(${this.zoomInfos[this.zoomLevel].dimensions}vw + 2px)`,
      height: `calc(${this.zoomInfos[this.zoomLevel].dimensions}vh + 2px)`,
      duration: 0,
      delay: out ? 0 : 0.1,
      onComplete: () => {
        const direction = out
          ? this.zoomInfos[this.zoomLevel].ratioOut
          : this.zoomInfos[this.zoomLevel].ratioIn;
        this.drag.x += window.innerWidth * direction;
        this.drag.y += window.innerHeight * direction;
        gsap.to(".xp_section_collection", {
          duration: 0,
          x: this.drag.x,
          y: this.drag.y, // Aucun décalage vertical
        });
      },
    });
  }
  wrapperScale(tl, out) {
    tl.to(this.xpWrapper, {
      scale: `${this.zoomInfos[this.zoomLevel].scale}`,
      duration: 1.5,
      delay: out ? 0.1 : 0,
      ease: "expo.inOut",
    });
  }
}

// UTILS

function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}
function isTablet() {
  return (
    /iPad|Android(?!.*Mobile)|Tablet/i.test(navigator.userAgent) ||
    (window.innerWidth >= 768 &&
      window.innerWidth <= 1366 &&
      "ontouchstart" in window)
  );
}

// if (isTablet()) {
//   document.documentElement.classList.add("tablet");
// }

// Utility function for throttling
function throttle(callback, delay) {
  let lastCall = 0;

  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      callback(...args);
    }
  };
}
// Fonction debounce
// function debounce(callback, delay) {
//   let timer;

//   return function (...args) {
//     clearTimeout(timer); // Annule le précédent timer si un autre appel arrive
//     timer = setTimeout(() => {
//       callback(...args); // Exécute la fonction après le délai
//     }, delay);
//   };
// }
function debounce(fn, delay) {
  let timeoutId;

  function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }

  debounced.cancel = () => clearTimeout(timeoutId);

  return debounced;
}

function isMobileOrTabletOrLand() {
  const isTablet =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || "ontouchstart" in window;

  const isLandscape = window.matchMedia("(orientation: landscape)").matches;

  // Exclure les tablettes en mode paysage
  return isTablet && !isLandscape;
}
function isMobileOrTabletLand() {
  const isTablet =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || "ontouchstart" in window;

  const isLandscape = window.matchMedia("(orientation: landscape)").matches;

  // Exclure les tablettes en mode paysage
  return isTablet && !isLandscape;
}

function onlyDesktop() {
  const isMobileOrTablet =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || "ontouchstart" in window; // Inclut tous les appareils à écran tactile

  // Retourne true si l'écran est supérieur à 1024px et qu'il n'est pas un appareil mobile/tablette
  return !isMobileOrTablet && window.innerWidth >= 1024;
}

function lerpPower2InOut(start, end, t) {
  t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  return start + (end - start) * t;
}
function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

const customEasing = (t) =>
  gsap.parseEase("expo.inOut")(Math.max(0, t + 0.1) / 1.1);

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function easePower3Out(t) {
  return (1 - (1 - t)) ^ 3;
  // Exemple d'easing
}

function easePower3InOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3); // Exemple d'easing
}
function easeOutQuad(x) {
  return 1 - (1 - x) * (1 - x);
}

const easeQuadOut = (t) => 1 - (1 - t) ** 2; // power2.out

// Fonction Lerp avec easing
function lerpWithEase(a, b, t, easingFunction) {
  t = easingFunction(t); // Appliquer l'easing à t
  return a + (b - a) * t; // Retourne la valeur interpolée
}

new Home();
