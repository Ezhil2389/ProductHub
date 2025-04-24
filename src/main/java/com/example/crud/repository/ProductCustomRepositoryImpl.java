package com.example.crud.repository;

import com.example.crud.model.Product;
import com.example.crud.model.QProduct;
import com.example.crud.model.QUser;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public class ProductCustomRepositoryImpl implements ProductCustomRepository {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public List<Product> findProductsByCustomCriteria(
            String namePattern,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Integer minQuantity,
            Integer maxQuantity,
            String createdByUsername) {

        JPAQueryFactory queryFactory = new JPAQueryFactory(entityManager);
        QProduct product = QProduct.product;
        QUser user = QUser.user;

        BooleanBuilder whereClause = new BooleanBuilder();

        if (namePattern != null && !namePattern.trim().isEmpty()) {
            whereClause.and(product.name.containsIgnoreCase(namePattern));
        }

        if (minPrice != null) {
            whereClause.and(product.price.goe(minPrice));
        }

        if (maxPrice != null) {
            whereClause.and(product.price.loe(maxPrice));
        }

        if (minQuantity != null) {
            whereClause.and(product.quantity.goe(minQuantity));
        }

        if (maxQuantity != null) {
            whereClause.and(product.quantity.loe(maxQuantity));
        }

        if (createdByUsername != null && !createdByUsername.trim().isEmpty()) {
            whereClause.and(product.createdBy.username.eq(createdByUsername));
        }

        return queryFactory
                .selectFrom(product)
                .leftJoin(product.createdBy, user)
                .where(whereClause)
                .orderBy(product.name.asc())
                .fetch();
    }
} 