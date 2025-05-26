package com.example.crud.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.hamcrest.Matchers.notNullValue;

@SpringBootTest
@AutoConfigureMockMvc
public class WebSecurityConfigIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @ActiveProfiles("dev")
    @WithAnonymousUser // H2 console is permitAll under dev/test, so anonymous should work
    public void testH2Console_withDevProfile_shouldBeAccessible() throws Exception {
        // H2 console often redirects, so we check for 200 OK or 3xx redirect
        // If it's a redirect, Spring Security itself might be redirecting to a login page if not configured for permitAll correctly for anonymous.
        // However, our config permits /h2-console/** for dev/test
        mockMvc.perform(get("/h2-console/"))
                .andExpect(status().isOk()); // Expect 200 OK directly as frame options are set
    }

    @Test
    @ActiveProfiles("test")
    @WithAnonymousUser
    public void testH2Console_withTestProfile_shouldBeAccessible() throws Exception {
        mockMvc.perform(get("/h2-console/"))
                .andExpect(status().isOk());
    }

    @Test
    @ActiveProfiles("prod")
    @WithAnonymousUser // Test with an anonymous user to ensure it's not publicly accessible
    public void testH2Console_withProdProfile_shouldBeRedirectedToLoginOrForbidden() throws Exception {
        // In "prod" profile, /h2-console/** is not explicitly permitted.
        // It should fall under `anyRequest().authenticated()`.
        // An anonymous user attempting to access it should be redirected to login (302) or get 401/403.
        // Spring Boot default is a 302 redirect to /login if a login page is configured, or 401 if not.
        MvcResult result = mockMvc.perform(get("/h2-console/"))
                .andExpect(status().isUnauthorized()) // Expect 401 as there's no default login page form
                .andReturn();
    }

    @Test
    @ActiveProfiles("default") // No specific "dev" or "test" profile
    @WithAnonymousUser
    public void testH2Console_withNoSpecificDevTestProfile_shouldBeRedirectedToLoginOrForbidden() throws Exception {
        mockMvc.perform(get("/h2-console/"))
                .andExpect(status().isUnauthorized())
                .andReturn();
    }
}
