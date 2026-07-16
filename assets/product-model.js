/* Product Media 3D model start */
var productMediaModel = {
    loadShopifyXR() {
        Shopify.loadFeatures([{
                name: 'shopify-xr',
                version: '1.0',
                onLoad: this.setupShopifyXR.bind(this),
            },
            {
                name: 'model-viewer-ui',
                version: '1.0',
                onLoad: (function() {
                    document.querySelectorAll('.product-model-item').forEach((model) => {
                        let model3D = model.querySelector('model-viewer')
                        model.modelViewerUI = new Shopify.ModelViewerUI(model3D);
                        model3D.addEventListener('shopify_model_viewer_ui_toggle_play', function(evt) {
                            model.querySelectorAll('.close-product-model').forEach(el => {
                                el.classList.remove('hidden');
                            });
                            let productSliderParent = model.closest('[data-product-main-media]');
                            if (productSliderParent && productSliderParent.classList.contains('flickity-enabled')) {
                                let productSlider = Flickity.data(productSliderParent)
                                productSlider.options.draggable = false;
                                productSlider.updateDraggable();
                            }
                        }.bind(this));

                        model3D.addEventListener('shopify_model_viewer_ui_toggle_pause', function(evt) {
                            model.querySelectorAll('.close-product-model').forEach(el => {
                                el.classList.add('hidden');
                            });
                            let productSliderParent = model.closest('[data-product-main-media]');
                            if (productSliderParent && productSliderParent.classList.contains('flickity-enabled')) {
                                let productSlider = Flickity.data(productSliderParent)
                                productSlider.options.draggable = true;
                                productSlider.updateDraggable();
                            }
                          
                        }.bind(this));

                        model.querySelectorAll('.close-product-model').forEach(el => {
                            el.addEventListener('click', function() {
                                if (model3D) {
                                    model.modelViewerUI.pause();
                                }
                            }.bind(this))
                        });

                    });

                })
            }
        ]);
    },

    setupShopifyXR(errors) {
        if (!errors) {
            if (!window.ShopifyXR) {
                document.addEventListener('shopify_xr_initialized', () =>
                    this.setupShopifyXR()
                );
                return;
            }
            document.querySelectorAll('[id^="product3DModel-"]').forEach((model) => {
                window.ShopifyXR.addModels(JSON.parse(model.textContent));
            });
            window.ShopifyXR.setupXRElements();
        }
    },
};

function productMedia3dModel(section = document) {
    let productModel = document.querySelectorAll('[id^="product3DModel-"]');
    if (productMediaModel && productModel.length > 0) {
        productMediaModel.loadShopifyXR();
    }
}

document.addEventListener("DOMContentLoaded", productMedia3dModel ,false);
document.addEventListener("shopify:section:load",productMedia3dModel ,false );