var Login = {
    success: false,
    timer: null,
    base: '',
    thirdparty: false,
    windowProxy: null,
    secure: false,
    popupOptions: {
        type: 'inline',
        margin: 0,
        padding: 0,
        wrapCSS: 'account-popup',
        width: 768,
        maxHeight: '90%',
        helpers: {
            overlay: {
                closeClick: false
            }
        }
    },

    init: function (thirdparty, base, windowProxy) {
        jQuery(function () {
            Login.__init__(thirdparty, base, windowProxy);
        });
    },
    __init__: function (thirdparty, base, windowProxy, secure) {
        jQuery.validator.addMethod("english", function (value, element) {
            return this.optional(element) || (value.search(/[^a-z|A-Z|0-9|\s\s\-_\.]/gi) == -1);
        },
            jQuery.validator.format(jQuery.validator.messages.english)
        );
        jQuery.validator.addMethod("dropDownValidator", function (value, element, parameters) {
            return (value != '');
        });
        jQuery.validator.addMethod("complexity", function (value, element, parameters) {
            return this.optional(element) || ((value.search(/.{8,}/gi) != -1) && (value.search(/\W/gi) != -1) && (value.search(/\d/gi) != -1));
        }
        );

        Login.base = base;
        Login.thirdparty = thirdparty;
        Login.windowProxy = windowProxy;
        Login.secure = secure;

        Login.initUI();

    },
    showOverlay: function () {
        if (typeof LoadingOverlay !== "undefined")
            LoadingOverlay.show();
    },
    hideOverlay: function () {
        if (typeof LoadingOverlay !== "undefined")
            LoadingOverlay.hide();
    },
    initUI: function () {

        Login.initMenu();
        Login.initLogin();

        jQuery('#frmForgetPassword').validate({
            debug: false,
            submitHandler: function (form) {
                //jQuery('#formArea').addClass('ajaxLoading');

                Login.showOverlay();

                if (Login.thirdparty) {
                    Login.windowProxy.post({
                        'forgotpassword': true,
                        'txtEmail': jQuery("#txtForgetPasswordEmail").val(),
                        'thirdparty': true,
                        'baseURL': Login.base,
                        'path': jQuery("#frmForgetPassword").attr("action")
                    });
                }
                else {
                    jQuery.ajax({
                        type: jQuery("#frmForgetPassword").attr("method"),
                        url: Login.base + jQuery("#frmForgetPassword").attr("action"),
                        data: { "txtEmail": jQuery("#txtForgetPasswordEmail").val(), "code": jQuery("#captchaCode").val() },
                        dataType: "json",
                        error: function (data) {
                            window.location = Login.base + "/error-500.aspx";

                            Login.hideOverlay();
                        },
                        success: function (result) {
                            Login.hideOverlay();

                            jQuery("#forgetResultArea").html(result.Message).show();

                            if (result.status === "success") {
                                jQuery("#frmForgetPassword, #forgetPasswordTitle").css({ visibility: 'hidden' });

                                jQuery("#forgetResultArea").removeClass("error");

                                jQuery("#frmForgetPassword, #forgetPasswordTitle").hide().css({ visibility: 'visible' });
                            } else if (result.status === 'captcha') {
                                jQuery('#codeError').show();
                            } else {
                                jQuery("#forgetResultArea").addClass("error");

                                jQuery("#frmForgetPassword, #forgetPasswordTitle").css({ visibility: 'visible' });
                            }

                            Login.hideOverlay();
                        }
                    });
                }
            }
        });

        /**************** Add Token **************************/
        if (Login.thirdparty) {
            if (jQuery('#frmSignUp, #frmJoinGHA').length) {
                Login.windowProxy.post({
                    'addToken': true,
                    'thirdparty': true,
                    'baseURL': Login.base
                });
            }
        } else {
            jQuery.get(Login.base + "/ajax/CallToken.aspx", function (result) {
                jQuery("#frmSignUp").append('<input type="hidden" name="hidCT" value="' + result + '" />');
            });
        }

        jQuery('#frmProfileLogin').validate({
            debug: false,
            errorPlacement: function (error, element) {
                error.appendTo(element.parent());
            },
            submitHandler: function (form) {
                Login.showOverlay();

                jQuery("#loginResultArea").hide();

                var baseURL = jQuery("#frmProfileLogin").attr("action");

                if (Login.thirdparty) {
                    Login.windowProxy.post({
                        'loginEmail': jQuery("#txtGuestEmail").val(),
                        'loginPassword': jQuery("#txtGuestPassword").val(),
                        'thirdparty': true,
                        'secure': Login.secure,
                        'baseURL': Login.base
                    });
                }
                else {
                    jQuery.ajax({
                        type: jQuery("#frmProfileLogin").attr("method"),
                        url: Login.base + "/ajax/login-script.aspx",
                        data: {
                            "txtEmail": jQuery("#txtGuestEmail").val(),
                            "txtPassword": jQuery("#txtGuestPassword").val()
                        },
                        dataType: "json",
                        error: function (data) {
                            window.location = Login.base + "/error-500.aspx";

                            Login.hideOverlay();
                        },
                        success: function (result) {
                            Login.eventTracking('privilege', 'login', result.currentlanguage + '/' + result.Message);

                            Login.redirectAfterLogin(result);

                        }
                    });
                }
            }
        });

        var frmViewMyBookingRules = {
            bookingnumber: "required",
            lastname: "required"
        };

        if (Login.thirdparty) {
            frmViewMyBookingRules = {
                bookingnumber: "required",
                lastname: {
                    required: true,
                    email: {
                        depends: function (element) {
                            var bookingNumber = jQuery('#bookingnumber').val();

                            if (bookingNumber != '') {
                                return (bookingNumber.search(/^\d{1,}SB\d{1,}$/i) != -1);
                            }
                        }
                    }
                }
            };
            jQuery('body').delegate('#bookingnumber', 'blur', function (event) {
                var bookingNumber = jQuery('#bookingnumber').val();

                if (bookingNumber != '') {
                    if (bookingNumber.search(/^\d{1,}SB\d{1,}$/i) != -1) {
                        jQuery('.input__label-content.lastname').hide();
                        jQuery('.input__label-content.email').show();
                    } else {
                        jQuery('.input__label-content.lastname').show();
                        jQuery('.input__label-content.email').hide();
                    }
                }
            })
        }

        jQuery('#frmViewMyBooking').validate({
            rules: frmViewMyBookingRules,
            messages: {
                bookingnumber: {
                    digits: ""
                },
                lastname: {
                    email: "Please enter reservation email"
                }
            },
            errorPlacement: function (error, element) {
                error.appendTo(element.parent());
            },
            submitHandler: function (form) {
                var bookingNumber = jQuery('#bookingnumber').val();

                if (bookingNumber.search(/^\d{1,}SB\d{1,}$/i) != -1) {
                    var url = 'https://gc.synxis.com/rez.aspx?start=modifyres&template=oaks&shell=oaks&brand=oaks&email=';

                    if (jQuery("#bc").val() == "OH") {
                        url = 'https://gc.synxis.com/rez.aspx?start=modifyres&template=oaks&shell=oaks&brand=oaks&email=';
                    } else if (jQuery("#bc").val() == "TV") {
                        url = 'https://gc.synxis.com/rez.aspx?start=modifyres&template=tivoli&shell=tivoli&brand=tivoli&email=';
                    } else if (jQuery("#bc").val() == "AV") {
                        url = 'https://gc.synxis.com/rez.aspx?start=modifyres&template=avani&shell=avani&brand=avani&email=';
                    } else if (jQuery("#bc").val() == "AN") {
                        url = 'https://gc.synxis.com/rez.aspx?start=modifyres&template=anantara&shell=anantara&brand=anantara&email=';
                    }

                    url += jQuery('#lastname').val() + '&confirm=' + jQuery('#bookingnumber').val() + '&hotel=' + jQuery('#bookingnumber').val().split("SB")[0];
                    var win = window.open(url, '_blank');
                    if (win) {
                        win.focus();
                    }
                } else {
                    Login.showOverlay();

                    jQuery('#frmViewMyBooking').css({ visibility: 'hidden' });
                    jQuery('#frmViewMyBooking').attr({
                        'action': Login.base + jQuery('#frmViewMyBooking').attr('action')
                    });
                    form.submit();
                }
            }
        });

        jQuery('a.lnkCaptcha').click(function () {
            jQuery('img#imgCaptcha').attr('src', jQuery('img#imgCaptcha').data('src') + '?v=' + Math.random());

            return false;
        });

        jQuery('a[href*="#signUpPopup"]').click(function () {
            if (typeof (jQuery.fancybox) == "function")
                jQuery.fancybox.close();

            jQuery('a#lnkSignup').click();

            return false;
        });
        jQuery('a[href*="#loginPopup"]').click(function () {
            if (typeof (jQuery.fancybox) == "function")
                jQuery.fancybox.close();

            jQuery('a#lnkMyProfile').click();

            return false;
        });

        jQuery("#captchaCode").keydown(function () {
            jQuery('#codeError').hide();
        });

        if (jQuery.fn.jquery == "1.7.1") {
            jQuery('a[href*="#signUpPopup"]').live('click', function (event) {
                if (typeof (jQuery.fancybox) == "function")
                    jQuery.fancybox.close();

                jQuery('a#lnkSignup').click();

                return false;
            });

            jQuery('a[href*="#loginPopup"]').live('click', function (event) {
                if (typeof (jQuery.fancybox) == "function")
                    jQuery.fancybox.close();

                jQuery('a#lnkMyProfile').click();

                return false;
            });
        } else {

            jQuery('body').delegate('a[href*="#signUpPopup"]', 'click', function (event) {
                if (typeof (jQuery.fancybox) == "function")
                    jQuery.fancybox.close();

                jQuery('a#lnkSignup').click();

                return false;
            });

            jQuery('body').delegate('a[href*="#loginPopup"]', 'click', function (event) {
                if (typeof (jQuery.fancybox) === "function")
                    jQuery.fancybox.close();

                jQuery('a#lnkMyProfile').click();

                return false;
            });
        }

        jQuery('body').delegate("#lnkForgetPassword, a.forget-password", 'click', function (event) {
            jQuery('img#imgCaptcha').attr('src', jQuery('img#imgCaptcha').data('src') + '?v=' + Math.random());

            jQuery('#loginArea').hide();
            jQuery('#forgetPasswordArea').show();

            jQuery("#frmForgetPassword, #forgetPasswordTitle").show().css({ visibility: 'visible' });
            jQuery("#forgetResultArea").hide();

            jQuery("#txtForgetPasswordEmail").val('').focus();
            jQuery("#captchaCode").val('');
            return false;
        });

        jQuery("#lnkResetPassword").click(function () {
            var email = jQuery("#txtGuestEmail").val();
            if (email != "") {
                //jQuery('#formArea').addClass('ajaxLoading');
                Login.showOverlay();

                jQuery("#loginUnsuccessful").css({ visibility: 'hidden' });
                jQuery.ajax({
                    type: jQuery("#frmForgetPassword").attr("method"),
                    url: Login.base + '/ajax/forgetpassword-script.aspx',
                    data: { "txtEmail": email },
                    dataType: "json",
                    error: function (data) {
                        window.location = Login.base + "/error-500.aspx";

                        Login.hideOverlay();
                    },
                    success: function (result) {
                        Login.eventTracking('privilege', 'forgetpassword', result.currentlanguage + '/' + result.Message);

                        //jQuery('#formArea').removeClass('ajaxLoading');
                        jQuery("#loginResultArea").html(result.Message);
                        jQuery("#loginResultArea").show();

                        Login.hideOverlay();
                    }
                });
            }
            return false;
        });

        jQuery("#lnkLogin, #lnkLogin2").click(function () {

            jQuery('#loginArea').show();
            jQuery('#forgetPasswordArea').hide();

            jQuery("#txtGuestEmail").focus();
            return false;
        });

        jQuery(".dialog a.close, .dialog a.cancel").click(function (event) {
            event.preventDefault();
            jQuery.fancybox.close();
        });

        jQuery('#joinPrivilege.dialog a.dismiss, #joinPrivilegeAfterLogin.dialog a.dismiss').click(function () {
            jQuery(this).parent().fadeOut(300);

            return false;
        });

        if (window.location.hash.search(/[^\s]/gi) != -1) {
            if (window.location.hash == '#login') {
                setTimeout(function () {
                    jQuery('a#lnkMyProfile').click();
                }, 1000);
            } else if (window.location.hash == "#signup") {
                setTimeout(function () {
                    jQuery('a#lnkSignup').click();
                }, 1000);
            }
        }
        //setTimeout(function () {
        //    jQuery('#joinPrivilege.dialog a.dismiss').click();
        //}, 1000);
    },
    overwriteSitecore: function () {
        // AVANI Login and Signup
        if (window.location.href.search(/minorhotels\.com\/\w{2}\/avani/gi) != -1) {
            if (!jQuery('.js-my-signup').length || !jQuery('.js-my-signup').is(':visible')) {
                jQuery('.js-privilege-form').hide();
            }
        }

        // PERAQUUM Login and Signup
        if ((window.location.href.search(/minorhotels\.com\/\w{2}\/peraquum|niyama(\-staging\.minorhotels)?\.com/gi) != -1) || (window.location.href.search(/niyama\.com\/?/gi) != -1)) {
            if (!jQuery('.js-my-signup').length || !jQuery('.js-my-signup').is(':visible')) {
                jQuery('.js-privilege-form').hide();
            }
        }
    },
    initMenu: function () {
        Login.overwriteSitecore();

        jQuery('.input__field--ruri').blur(function () {
            if (jQuery(this).val()) {
                jQuery(this).parent().addClass("input--filled");
            }
        });

        jQuery('html').click(function (e) {
            var isLoginPopupShown = jQuery("#loginPopup").is(':visible');
            var isMyBookingPopupShown = jQuery("#myBookingPopup").is(':visible');
            var isSignupPopupShown = jQuery("#signupPopup").is(':visible');

            if (isLoginPopupShown) {
                jQuery('a#lnkMyProfile').removeClass('hover');
                jQuery('#loginPopup').fadeOut({ duration: 100, queue: false });
            }

            if (isMyBookingPopupShown) {
                jQuery('a#lnkMyBooking').removeClass('hover');
                jQuery('#myBookingPopup').fadeOut({ duration: 100, queue: false });
            }

            if (isSignupPopupShown) {
                jQuery('a#lnkSignup').removeClass('hover');
                jQuery('#signupPopup').fadeOut({ duration: 100, queue: false });
            }

        });

        jQuery('#loginPopup, #myBookingPopup, #signupPopup').bind('click', function (event) {
            event.stopPropagation();
        });

        jQuery('a#lnkMyProfile').bind('click', function (event) {
            if ((Login.thirdparty && Login.secure) || (!Login.thirdparty && !jQuery('body').hasClass('mobile'))) {
                var options = jQuery.extend({}, Login.popupOptions, {
                    beforeShow: function () {
                        jQuery('#frmProfileLogin').validate().resetForm();
                        jQuery('a#login').click();
                    }
                });
                jQuery.fancybox.open('#dialogAccount', options);

            } else {
                jQuery('a#lnkMyProfile').attr("href", jQuery('a#lnkMyProfile').attr("href") + "&reurl=" + escape(window.location.href) + "#login");

                parent.location.href = jQuery('a#lnkMyProfile').attr("href");
            }

            return false;
        });

        jQuery('a#lnkMyBooking').bind('click', function (event) {
            var isShown = jQuery("#myBookingPopup").is(':visible');

            if (isShown) {
                jQuery('a#lnkMyBooking').removeClass('hover');
                jQuery('#myBookingPopup').fadeOut({ duration: 100, queue: false });
            }
            else {
                jQuery('.myprivilege li a').removeClass('hover');
                jQuery('.myprivilege .dialog').fadeOut({ duration: 0, queue: false });

                clearTimeout(Login.timer);

                jQuery(this).addClass('hover');

                jQuery('#myBookingPopup').fadeIn({ duration: 500, queue: false });

                jQuery('#bookingnumber').focus();
            }

            return false;
        });

        jQuery('a#lnkSignup').bind('click', function (event) {
            if (Login.thirdparty && Login.secure || (!Login.thirdparty && !jQuery('body').hasClass('mobile'))) {
                var options = jQuery.extend({}, Login.popupOptions, {
                    beforeShow: function () {
                        jQuery('#frmSignUp').validate().resetForm();

                        jQuery('a#signup').click();
                    }
                });
                jQuery.fancybox.open('#dialogAccount', options);
            }
            else //(Login.thirdparty)
            {
                jQuery('a#lnkSignup').attr("href", jQuery('a#lnkSignup').attr("href") + "&reurl=" + escape(window.location.href) + "#signup");

                parent.location.href = jQuery('a#lnkSignup').attr("href");

            }

            return false;
        });
        jQuery('.myBookingPopupClose, .loginPopupClose, .signupPopupClose').click(function () {
            jQuery('a#lnkMyProfile').removeClass('hover');
            jQuery('#loginPopup').fadeOut({ duration: 100, queue: false });

            jQuery('a#lnkMyBooking').removeClass('hover');
            jQuery('#myBookingPopup').fadeOut({ duration: 100, queue: false });

            jQuery('a#lnkSignup').removeClass('hover');
            jQuery('#signupPopup').fadeOut({ duration: 100, queue: false });
        });

        if (!Login.thirdparty || window.location.hostname.search(/^(www\.|staging\.|uat\.)oakshotels\.com$/gi) !== -1) {
            jQuery('a#lnkWelcome').bind('mouseenter click', function (event) {
                clearTimeout(Login.timer);

                jQuery(this).addClass('hover');

                jQuery('#myProfile .menu').fadeIn({ duration: 500, queue: false });

                return false;
            });

            jQuery('#myProfile').bind('mouseleave', function (event) {
                Login.timer = setTimeout(function () {
                    jQuery('a#lnkWelcome').removeClass('hover');
                    jQuery('#myProfile .menu').fadeOut({ duration: 100, queue: false });
                }, 200);
            }).bind('mouseenter', function (event) {
                clearTimeout(Login.timer);
            });
        }
    },
    initLogin: function () {
        jQuery.validator.addMethod("english", function (value, element) {
            return this.optional(element) || (value.search(/[^a-z|A-Z|0-9|\s\s\-_\.]/gi) == -1);
        },
            jQuery.validator.messages.english
        );
        jQuery.validator.addMethod("dropDownValidator", function (value, element, parameters) {
            return (value != '');
        });
        jQuery.validator.addMethod("complexity", function (value, element, parameters) {
            return this.optional(element) || ((value.search(/.{8,}/gi) != -1) && (value.search(/\W/gi) != -1) && (value.search(/\d/gi) != -1));
        });

        if (!Login.thirdparty) {
            $('#signupemail').on('blur', function () {
                var $this = $(this);
                var $suggestion = $(this).nextAll('.email-suggestion');

                $(this).mailcheck({
                    suggested: function (element, suggestion) {
                        $suggestion.html($suggestion.data('suggestion').replace('##email##', suggestion.full));

                        $suggestion.click(function () {
                            $this.val(suggestion.full);
                            $suggestion.html("");
                        });
                    },
                    empty: function (element) {
                        $suggestion.html("");
                        $suggestion.unbind('click');
                    }
                });
            });
        }
        jQuery('#frmSignUp').validate({
            debug: false,
            rules: {
                signupfirstname: {
                    required: true,
                    english: true
                },
                signuplastname: {
                    required: true,
                    english: true
                },
                signupemail: {
                    required: true,
                    email: true
                },
                signuppassword: {
                    required: true,
                    complexity: true
                }
            },
            errorPlacement: function (error, element) {
                error.appendTo(element.parent());
            },
            submitHandler: function (form) {
                Login.showOverlay();

                if (Login.thirdparty) {
                    Login.windowProxy.post({
                        'signupnew': true,
                        'frmSignUp': jQuery("#frmSignUp").serialize(),
                        'thirdparty': true,
                        'bcVal': jQuery("#bc").val(),
                        'secure': Login.secure,
                        'baseURL': Login.base
                    });
                }
                else {

                    jQuery.ajax({
                        url: Login.base + "/ajax/signup.aspx?bc=" + jQuery("#hidbc").val(),
                        data: jQuery("#frmSignUp").serialize(),
                        dataType: "json",
                        type: 'post',
                        error: function (data) {
                            Login.hideOverlay();

                            parent.location.href = Login.base + "/error-500.aspx";
                        },
                        success: function (result) {
                            if (result.Status == 'success') {

                                if (result.Message == "OH") {
                                    Login.success = true;
                                    Login.eventTracking('myoaks', 'signup', result.currentlanguage + '/' + result.Message);
                                    //location.reload();
                                    parent.location.href = "http://www.minorhotels.com/en/oaks";


                                }
                                else if (result.Message == "TV") {
                                    Login.success = true;
                                    Login.eventTracking('tivoli', 'signup', result.currentlanguage + '/' + result.Message);
                                    //location.reload();
                                    parent.location.href = "http://www.minorhotels.com/en/tivoli";


                                }
                                else {
                                    Login.eventTracking('privilege', 'signup', result.currentlanguage + '/' + result.Message);

                                    Login.success = true;

                                    var reurl = Login.GetValueQueryString("reurl", "");

                                    parent.location.href = Login.base + "/your-privilege.aspx?language=" + result.currentlanguage + "&bc=" + result.Message;
                                }
                            }
                            else if (result.Status == 'fail') {
                                jQuery("#SignUpStatus").html(result.Message);
                                jQuery("#SignUpStatus").show();
                                Login.hideOverlay();
                            }
                            else {
                                jQuery("#SignUpStatus").html(result.Message);
                                jQuery("#SignUpStatus").show();
                                Login.hideOverlay();

                                //self.parent.location.href = Login.base + "/your-privilege.aspx?language=" + result.currentlanguage;
                            }
                        }
                    });
                }
            }
        });

        jQuery('#frmFacebookConfirmPassword').validate({
            debug: false,
            submitHandler: function (form) {
                //jQuery('#formArea').addClass('ajaxLoading');
                Login.showOverlay();

                if (Login.thirdparty) {
                    Login.windowProxy.post({
                        'fbconfirmpassword': true,
                        'frmfbconfirmpassword': jQuery("#frmFaceBookLogin").serialize() + "&FBLogin=FBConfirmPassword&txtFBConfirmPassword=" + jQuery("#txtFBConfirmPassword").val(),
                        'thirdparty': true,
                        'baseURL': Login.base
                    });
                }
                else {
                    jQuery.ajax({
                        url: Login.base + "/ajax/login-script.aspx",
                        data: jQuery("#frmFaceBookLogin").serialize() + "&FBLogin=FBConfirmPassword&txtFBConfirmPassword=" + jQuery("#txtFBConfirmPassword").val(),
                        dataType: "json",
                        type: 'post',
                        error: function (data) {
                            window.location = Login.base + "/error-500.aspx";
                        },
                        success: function (result) {
                            Login.hideOverlay();

                            //alert(result.Status);
                            if (result.Status == "fail") {
                                jQuery("#lblerror").html(result.Message);
                            }
                            Login.redirectAfterLogin(result);
                        }
                    });

                }
            }
        });

        jQuery("#btnCancleFBConfirmPassword, #divfrmFBConfirmPWS a.close").on("click", function () {
            Login.showOverlay();

            if (Login.thirdparty) {
                Login.windowProxy.post({
                    'fbcancelconfirmpassword': true,
                    'frmfbcancelconfirmpassword': jQuery("#frmFaceBookLogin").serialize() + "&FBLogin=FBCancelConfirmPassword",
                    'thirdparty': true,
                    'baseURL': Login.base
                });
            }
            else {
                jQuery.ajax({
                    url: Login.base + "/ajax/login-script.aspx",
                    data: jQuery("#frmFaceBookLogin").serialize() + "&FBLogin=FBCancelConfirmPassword",
                    dataType: "json",
                    type: 'post',
                    error: function (data) {
                        window.location = Login.base + "/error-500.aspx";
                    },
                    success: function (result) {
                        Login.hideOverlay();

                        Login.setCookie('__privilege__firstLogin__', 'yes', 168);

                        Login.redirectAfterLogin(result);
                    }
                });

            }
        });

        jQuery("#facebookAppPermission .close").click(function () {
            jQuery.fancybox.close();
        });
    },
    GetValueQueryString: function (key, default_) {
        if (default_ == null) default_ = "";

        key = key.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regex = new RegExp("[\\?&]" + key + "=([^&#]*)", "gi");
        var qs = regex.exec(window.location.href);
        if (qs == null)
            return default_;
        else
            return qs[1];
    },

    redirectAfterLogin: function (result) {
        var reurl = "";

        if (result.Status === 'success-popup') {
            Login.showOverlay();

            reurl = Login.GetValueQueryString("reurl", "");
            if (reurl !== "") {
                window.location.href = reurl;
            }
            else {
                window.location.reload();
            }

        } else if (result.Status === 'sucess') {
            Login.success = true;

            reurl = Login.GetValueQueryString("reurl", "");

            if (reurl !== "") {
                reurl = unescape(reurl);

                var bc = Login.GetValueQueryString("bc", "AN");

                if (bc === "TV" || bc === "OH") {
                    var newCode = 'PRIVILEGE';
                    if (reurl.indexOf('gc.synxis.com') > -1) {
                        if (reurl.indexOf('promo=') > -1) {
                            reurl = reurl.replace(/(promo=).*?(&|$)/, '$1' + newCode + '$2');
                        } else {
                            reurl = reurl + "&promo=" + newCode;
                        }
                    }
                }
                window.location.href = reurl;
            }
            else if (Login.thirdparty) {
                //window.location.href = Login.base + "/your-privilege.aspx?language=" + result.currentlanguage;
                window.location.reload();
            } else {
                if (reurl !== "") {
                    var uri = decodeURI(unescape(reurl));
                    window.location.href = Login.base + uri;
                } else {
                    if (window.location.pathname === '/rooms.aspx' || window.location.pathname === '/offers.aspx' || window.location.pathname === '/default.aspx' || window.location.pathname === '/upsell.aspx' || window.location.pathname === '/booking.aspx' || window.location.pathname === '/payment.aspx') {
                        //self.parent.location.reload();

                        //Login.hideOverlay();

                        if (!currentViewing.is_public_member) {
                            Login.hideOverlay();

                            jQuery.fancybox.open(jQuery('#confirmLoggedIn'), {
                                modal: true,
                                padding: 0,
                                helpers: {
                                    overlay: {
                                        closeClick: false,
                                        css: {
                                            background: 'rgba(255,255,255,0.8)'
                                        },
                                        locked: true
                                    }
                                },
                                afterClose: function () {
                                    Login.showOverlay();

                                    location.reload();
                                }
                            });
                        } else {
                            location.reload();
                        }
                    } else if (window.location.pathname === '/privilege-account.aspx') {
                        window.location.href = '/reurl.aspx?page=homepage&brand=' + result.currentbrand + '&language=' + result.currentlanguage;;
                    }
                    else {
                        window.location.href = Login.base + "/your-privilege.aspx?bc=" + result.currentbrand + "&language=" + result.currentlanguage;
                    }

                    if (jQuery("p.BookingLoginTab").length > 0) {
                        jQuery("p.BookingLoginTab").hide();
                        var info = jQuery.parseJSON(result.UserInfo);
                        if (info != null) {
                            jQuery(".Detail #title_type").val(info.title_type);
                            jQuery(".Detail #firstname").val(info.firstname);
                            jQuery(".Detail #lastname").val(info.lastname);
                            jQuery(".Detail #prefer_firstname").val(info.prefer_firstname);
                            jQuery(".Detail #prefer_lastname").val(info.prefer_lastname);
                            jQuery(".Detail #email_address").val(info.email_address);
                            jQuery(".Detail #confirm_email").val(info.confirm_email);
                            jQuery(".Detail #city").val(info.city);
                            jQuery(".Detail #country").val(info.country).change();

                            if (info.phone_number !== '') {
                                var phone_number = info.phone_number.replace(new RegExp("\\+" + jQuery(".Detail #phone_number_part1").val(), "i"), "");
                                phone_number = phone_number.split('-');

                                if (phone_number.length > 1) {
                                    jQuery(".Detail #phone_number_part1").val(phone_number[0]);
                                    jQuery(".Detail #phone_number_part2").val(phone_number[1]);
                                } else {
                                    jQuery(".Detail #phone_number_part2").val(phone_number[0]);
                                }
                            }
                        }
                        if (result.UserPreferences !== "") {
                            var preferences = result.UserPreferences.split(",");
                            for (var i = 0; i < preferences.length; i++) {
                                if (jQuery("#profile_" + preferences[i]).length > 0) {
                                    jQuery("#profile_" + preferences[i]).attr("checked", "checked");
                                }
                            }
                        }
                    }
                }
            }
        } else if (result.Status === 'fail' || result.Status === 'invalid') {
            Login.success = false;

            jQuery("#loginExceed").hide();
            jQuery("#loginUnsuccessful").show();

            Login.hideOverlay();
        } else if (result.Status === 'exceed') {
            Login.success = false;

            jQuery("#loginExceed").show();
            jQuery("#loginUnsuccessful").hide();

            Login.hideOverlay();
        } else {
            if (result.ErrorCode !== null && result.ErrorCode !== '') {
                window.location = Login.base + "/error-500.aspx?code=" + result.ErrorCode;
            }
            else {
                window.location = Login.base + "/error-500.aspx";
            }

            Login.hideOverlay();
        }
    },
    setCookie: function (cname, cvalue, exhours) {
        var d = new Date();

        if (typeof (exhours) !== "undefined") {
            d.setTime(d.getTime() + (exhours * 60 * 60 * 1000));
            var expires = "expires=" + d.toUTCString();
            document.cookie = cname + "=" + cvalue + "; " + expires;
        } else {
            document.cookie = cname + "=" + cvalue;
        }
    },
    getCookie: function (cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1);
            if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
        }
        return false;
    },
    eventTracking: function (category, action, label) {
        try {
            if (window.ga && ga.create) {
                var trackers = ga.getAll();
                for (var i = 0; i < trackers.length; ++i) {
                    var tracker = trackers[i];
                    tracker.send('event', category, action, label);
                }
            }
        } catch (e) { }
    }
};