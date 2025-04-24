package com.example.crud.repository;

import com.example.crud.model.Product;
import com.example.crud.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, 
        QuerydslPredicateExecutor<Product>, 
        ProductCustomRepository {
    List<Product> findByCreatedBy(User user);
}