package com.example.crud.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.hamcrest.Matchers.is;

@SpringBootTest
@AutoConfigureMockMvc
public class ProductControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testEasterEgg_noParam_shouldReturnNotFoundResponse() throws Exception {
        mockMvc.perform(get("/products/easter-egg"))
                .andExpect(status().isNotFound()) // Changed from 200 OK to 404 Not Found as per endpoint logic
                .andExpect(jsonPath("$.error", is("Resource not found or parameter not activated")));
    }

    @Test
    public void testEasterEgg_paramFalse_shouldReturnNotFoundResponse() throws Exception {
        mockMvc.perform(get("/products/easter-egg?pentester_special_param=false"))
                .andExpect(status().isNotFound()) // Changed from 200 OK to 404 Not Found
                .andExpect(jsonPath("$.error", is("Resource not found or parameter not activated")));
    }

    @Test
    public void testEasterEgg_paramTrue_shouldReturnSuccessResponse() throws Exception {
        mockMvc.perform(get("/products/easter-egg?pentester_special_param=true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("Eureka!")))
                .andExpect(jsonPath("$.message", is("Congratulations, Mr./Ms. Pentester! You've found my little surprise! This one's on the house. The real challenge awaits! P.S. Remember to check product descriptions for 'features' ;)")));
    }
}
