package com.agripulse.backend.config;

import com.agripulse.backend.model.User;
import com.agripulse.backend.model.enums.Role;
import com.agripulse.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Demo seeds exist ONLY in dev/test. Production (mysql profile) starts empty. */
@Profile({"dev", "test"})
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Database already seeded, skipping initialization");
            return;
        }

        // Buyer
        User buyer = new User("u-buyer-1", "buyer@agripulse.demo",
                passwordEncoder.encode("buyer123"),
                "Ananya Foods Buyer", Role.BUYER, "ABC Foods Pvt Ltd", "Hyderabad");
        buyer.setPhone("+91 98480 11111");
        buyer.setDemandVolumeKgPerMonth(12000);

        // Supplier
        User supplier = new User("u-supplier-1", "supplier@agripulse.demo",
                passwordEncoder.encode("supplier123"),
                "Ravi FPO", Role.SUPPLIER, "Ravi FPO", "Rajahmundry");
        supplier.setPhone("+91 98480 22222");
        supplier.setFarmSizeAcres(25);
        supplier.setVillage("Rajahmundry");
        supplier.setVerified(true);
        supplier.setRating(4.5);

        // Admin
        User admin = new User("u-admin-1", "admin@agripulse.demo",
                passwordEncoder.encode("admin123"),
                "Admin User", Role.ADMIN, "AgriPulse", "Hyderabad");

        userRepository.save(buyer);
        userRepository.save(supplier);
        userRepository.save(admin);

        log.info("Seeded 3 demo users: buyer, supplier, admin");
    }
}
