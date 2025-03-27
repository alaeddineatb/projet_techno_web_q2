
document.addEventListener('DOMContentLoaded', function() {
    // Quantity buttons functionality
    document.querySelectorAll('.quantity-btn').forEach(button => {
        button.addEventListener('click', function() {
            const quantityElement = this.parentElement.querySelector('.quantity');
            let quantity = parseInt(quantityElement.textContent);
            
            if (this.textContent === '+' && quantity < 10) {
                quantity++;
            } else if (this.textContent === '-' && quantity > 1) {
                quantity--;
            }
            
            quantityElement.textContent = quantity;
            updateCartTotal();
        });
    });
    
    // Remove button functionality
    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.cart-item').remove();
            updateCartTotal();
        });
    });
    
    // Update cart total initially
    updateCartTotal();
});

function updateCartTotal() {
    let subtotal = 0;
    
    document.querySelectorAll('.cart-item').forEach(item => {
        const priceText = item.querySelector('.price').textContent;
        const price = parseFloat(priceText.replace('$', ''));
        const quantity = parseInt(item.querySelector('.quantity').textContent);
        subtotal += price * quantity;
    });
    
    const tax = subtotal * 0.12; // 12% tax for example
    const total = subtotal + tax;
    
    document.querySelector('.summary-row:nth-child(1) span:last-child').textContent = `$${subtotal.toFixed(2)}`;
    document.querySelector('.summary-row:nth-child(2) span:last-child').textContent = `$${tax.toFixed(2)}`;
    document.querySelector('.summary-row.total span:last-child').textContent = `$${total.toFixed(2)}`;
}