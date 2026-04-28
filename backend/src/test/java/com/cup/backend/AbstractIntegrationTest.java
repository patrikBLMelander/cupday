package com.cup.backend;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest
public abstract class AbstractIntegrationTest {

  // Singleton-container pattern: started once per JVM, reused across all
  // integration test classes. Avoids the "context-cached pool points at a
  // stopped container" issue that hits when each @Container is per-class.
  static final PostgreSQLContainer<?> POSTGRES;

  static {
    POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("cup")
        .withUsername("cup")
        .withPassword("cup");
    POSTGRES.start();
  }

  @DynamicPropertySource
  static void registerDatasource(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }
}
