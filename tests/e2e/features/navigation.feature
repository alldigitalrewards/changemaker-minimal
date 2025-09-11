@navigation
Feature: Public site navigation
  Visitors should be able to browse public pages and see 404 for unknown routes

  Background:
    Given the application is available

  Scenario: Visit home page
    When I visit "/"
    Then I should see the public navbar
    And I should see content for the home page

  Scenario Outline: Visit public marketing pages
    When I visit <path>
    Then I should see the page content

    Examples:
      | path             |
      | "/about"        |
      | "/how-it-works" |
      | "/faq"          |
      | "/contact"      |
      | "/help"         |
      | "/instruments"  |

  Scenario: Unknown route shows 404
    When I visit "/does-not-exist"
    Then I should see the not found page


