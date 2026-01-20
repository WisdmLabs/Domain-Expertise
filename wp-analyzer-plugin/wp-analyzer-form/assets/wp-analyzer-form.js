/**
 * WP Analyzer Form JavaScript
 * Handles form submission, validation, and user feedback
 */

(function($) {
    'use strict';

    $(document).ready(function() {
        // Initialize form handler
        initWPAnalyzerForm();
    });

    function initWPAnalyzerForm() {
        const $form = $('#wp-analyzer-form');
        const $submitBtn = $('.wp-analyzer-submit-btn');
        const $message = $('#wp-analyzer-message');
        const $btnText = $('.btn-text');
        const $btnLoading = $('.btn-loading');

        if (!$form.length) {
            return;
        }

        // Form submission handler
        $form.on('submit', function(e) {
            e.preventDefault();
            
            // Validate form
            if (!validateForm()) {
                return;
            }

            // Show loading state
            setLoadingState(true);
            hideMessage();

            // Prepare form data
            const formData = {
                action: 'wp_analyzer_submit',
                nonce: wpAnalyzerForm.nonce,
                email: $('#wp-analyzer-email').val(),
                url: $('#wp-analyzer-url').val(),
                format: $('input[name="format"]').val()
            };

            // Submit via AJAX
            $.ajax({
                url: wpAnalyzerForm.ajax_url,
                type: 'POST',
                data: formData,
                timeout: 30000, // 30 seconds timeout
                success: function(response) {
                    // Show success message
                    showMessage(wpAnalyzerForm.messages.success, 'success');
                    resetForm();
                },
                error: function(xhr, status, error) {
                    // Show success message even on errors
                    showMessage(wpAnalyzerForm.messages.success, 'success');
                    resetForm();
                },
                complete: function() {
                    // Hide loading state
                    setLoadingState(false);
                }
            });
        });

        // Real-time validation
        $('#wp-analyzer-email').on('blur', function() {
            validateEmail($(this));
        });

        $('#wp-analyzer-url').on('blur', function() {
            validateUrl($(this));
        });

        // Clear validation on input
        $('.wp-analyzer-input').on('input', function() {
            clearFieldError($(this));
        });
    }

    function validateForm() {
        let isValid = true;
        
        // Validate email
        const $email = $('#wp-analyzer-email');
        if (!validateEmail($email)) {
            isValid = false;
        }

        // Validate URL
        const $url = $('#wp-analyzer-url');
        if (!validateUrl($url)) {
            isValid = false;
        }

        return isValid;
    }

    function validateEmail($field) {
        const email = $field.val().trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            showFieldError($field, wpAnalyzerForm.messages.invalid_email);
            return false;
        }
        
        if (!emailRegex.test(email)) {
            showFieldError($field, wpAnalyzerForm.messages.invalid_email);
            return false;
        }
        
        clearFieldError($field);
        return true;
    }

    function validateUrl($field) {
        const url = $field.val().trim();
        
        if (!url) {
            showFieldError($field, wpAnalyzerForm.messages.invalid_url);
            return false;
        }
        
        try {
            new URL(url);
            clearFieldError($field);
            return true;
        } catch (e) {
            showFieldError($field, wpAnalyzerForm.messages.invalid_url);
            return false;
        }
    }

    function showFieldError($field, message) {
        $field.addClass('error');
        
        // Remove existing error message
        $field.siblings('.field-error').remove();
        
        // Add error message
        $field.after('<div class="field-error">' + message + '</div>');
    }

    function clearFieldError($field) {
        $field.removeClass('error');
        $field.siblings('.field-error').remove();
    }

    function setLoadingState(loading) {
        const $submitBtn = $('.wp-analyzer-submit-btn');
        const $btnText = $('.btn-text');
        const $btnLoading = $('.btn-loading');
        
        if (loading) {
            $submitBtn.prop('disabled', true);
            $btnText.hide();
            $btnLoading.show();
        } else {
            $submitBtn.prop('disabled', false);
            $btnText.show();
            $btnLoading.hide();
        }
    }


    function showMessage(message, type) {
        const $message = $('#wp-analyzer-message');
        
        if (type === 'success') {
            // Create professional success message with icon
            const successHTML = `
                <div class="message-content">
                    <span class="dashicons dashicons-yes"></span>
                    <span class="message-text">${message}</span>
                </div>
            `;
            $message
                .removeClass('success error')
                .addClass('success')
                .html(successHTML)
                .fadeIn();
        } else {
            $message
                .removeClass('success error')
                .addClass(type)
                .html(message)
                .fadeIn();
        }
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(function() {
                $message.fadeOut();
            }, 5000);
        }
    }

    function hideMessage() {
        $('#wp-analyzer-message').fadeOut();
    }

    function resetForm() {
        $('#wp-analyzer-form')[0].reset();
        $('.wp-analyzer-input').removeClass('error');
        $('.field-error').remove();
    }

})(jQuery);
