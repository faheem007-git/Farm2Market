package com.agripulse.backend.service;

import java.math.BigDecimal;

/**
 * Weighted match factor scores (0-100 each).
 * Weights: product 30, quantity 20, quality 20, price 15, location 10, availability 5.
 * Exact port of the frontend matcher - do not "improve".
 */
public class MatchFactors {
    private final int product;
    private final int quantity;
    private final int quality;
    private final int price;
    private final int location;
    private final int availability;

    public MatchFactors(int product, int quantity, int quality, int price,
                        int location, int availability) {
        this.product = product;
        this.quantity = quantity;
        this.quality = quality;
        this.price = price;
        this.location = location;
        this.availability = availability;
    }

    public int getProduct() { return product; }
    public int getQuantity() { return quantity; }
    public int getQuality() { return quality; }
    public int getPrice() { return price; }
    public int getLocation() { return location; }
    public int getAvailability() { return availability; }

    public static String fmt(BigDecimal v) {
        return v.stripTrailingZeros().toPlainString();
    }
}
